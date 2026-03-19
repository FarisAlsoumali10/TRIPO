import { Types } from 'mongoose';
import { Expense } from '../models';

export interface MemberBalance {
  userId: string;
  name: string;
  balance: number;
  status: 'owed' | 'owes' | 'settled';
}

export interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export interface SplitResult {
  totalExpenses: number;
  perPersonAverage: number;
  currency: string; // ✅ إضافة العملة لتستخدمها الواجهة الأمامية
  balances: MemberBalance[];
  settlements: Settlement[];
}

export class SplitBudgetService {
  async calculateSplit(groupTripId: Types.ObjectId | string): Promise<SplitResult> {
    // جلب كل المصاريف الخاصة بالرحلة
    const expenses = await Expense.find({ groupTripId })
      .populate('payerId', 'name')
      .populate('involvedMemberIds', 'name')
      .lean();

    // افتراض العملة الافتراضية للرحلة بناءً على أول مصروف (أو SAR كافتراضي)
    const tripCurrency = expenses.length > 0 ? (expenses[0] as any).currency || 'SAR' : 'SAR';

    if (expenses.length === 0) {
      return {
        totalExpenses: 0,
        perPersonAverage: 0,
        currency: tripCurrency,
        balances: [],
        settlements: []
      };
    }

    // ✅ استخدام الـ Halalas/Cents لتجنب أخطاء التقريب العشري في جافاسكريبت
    let totalExpensesInCents = 0;
    const memberBalances = new Map<string, { name: string; paid: number; owes: number }>();

    for (const expense of expenses) {
      const amountInCents = Math.round(expense.amount * 100);
      totalExpensesInCents += amountInCents;

      const payerId = (expense.payerId as any)._id.toString();
      const payerName = (expense.payerId as any).name;

      if (!memberBalances.has(payerId)) {
        memberBalances.set(payerId, { name: payerName, paid: 0, owes: 0 });
      }

      // إضافة ما دفعه الشخص
      memberBalances.get(payerId)!.paid += amountInCents;

      // ✅ دعم التقسيم بالتساوي (التحديث المستقبلي يمكن أن يدعم percentage و exact هنا)
      const involvedCount = expense.involvedMemberIds.length;
      if (involvedCount > 0) {
        // توزيع المبلغ وتجاهل الكسور البسيطة جداً
        const splitAmountInCents = Math.floor(amountInCents / involvedCount);

        for (const member of expense.involvedMemberIds) {
          const memberId = (member as any)._id.toString();
          const memberName = (member as any).name;

          if (!memberBalances.has(memberId)) {
            memberBalances.set(memberId, { name: memberName, paid: 0, owes: 0 });
          }

          memberBalances.get(memberId)!.owes += splitAmountInCents;
        }
      }
    }

    // حساب الأرصدة النهائية (Net Balances)
    const balances: MemberBalance[] = [];
    const creditors: { userId: string; name: string; amount: number }[] = [];
    const debtors: { userId: string; name: string; amount: number }[] = [];

    for (const [userId, { name, paid, owes }] of memberBalances.entries()) {
      const netBalanceInCents = paid - owes;
      const netBalance = netBalanceInCents / 100; // إعادة المبلغ لشكله العشري

      balances.push({
        userId,
        name,
        balance: Number(netBalance.toFixed(2)),
        status: netBalance > 0.01 ? 'owed' : netBalance < -0.01 ? 'owes' : 'settled'
      });

      if (netBalanceInCents > 1) { // أكبر من هللة واحدة
        creditors.push({ userId, name, amount: netBalanceInCents });
      } else if (netBalanceInCents < -1) {
        debtors.push({ userId, name, amount: -netBalanceInCents });
      }
    }

    // ✅ خوارزمية الجشع (Greedy Algorithm) لتسوية الديون بأقل عدد من التحويلات
    const settlements: Settlement[] = [];
    const sortedCreditors = creditors.sort((a, b) => b.amount - a.amount);
    const sortedDebtors = debtors.sort((a, b) => b.amount - a.amount);

    let i = 0;
    let j = 0;

    while (i < sortedCreditors.length && j < sortedDebtors.length) {
      const creditor = sortedCreditors[i];
      const debtor = sortedDebtors[j];

      // أخذ المبلغ الأصغر بين الدائن والمدين
      const settlementAmountInCents = Math.min(creditor.amount, debtor.amount);

      settlements.push({
        from: debtor.userId,
        fromName: debtor.name,
        to: creditor.userId,
        toName: creditor.name,
        amount: Number((settlementAmountInCents / 100).toFixed(2)) // إعادة للصيغة العشرية
      });

      creditor.amount -= settlementAmountInCents;
      debtor.amount -= settlementAmountInCents;

      if (creditor.amount === 0) i++;
      if (debtor.amount === 0) j++;
    }

    const uniqueMembers = memberBalances.size;
    const totalExpenses = totalExpensesInCents / 100;
    const perPersonAverage = uniqueMembers > 0 ? totalExpenses / uniqueMembers : 0;

    return {
      totalExpenses: Number(totalExpenses.toFixed(2)),
      perPersonAverage: Number(perPersonAverage.toFixed(2)),
      currency: tripCurrency,
      balances: balances.sort((a, b) => b.balance - a.balance), // ترتيب من الأعلى للأقل
      settlements
    };
  }
}

export const splitBudgetService = new SplitBudgetService();