import { Types } from 'mongoose';
import { Expense, User } from '../models';

interface MemberBalance {
  userId: string;
  name: string;
  balance: number;
  status: 'owed' | 'owes' | 'settled';
}

interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

interface SplitResult {
  totalExpenses: number;
  perPersonAverage: number;
  balances: MemberBalance[];
  settlements: Settlement[];
}

export class SplitBudgetService {
  async calculateSplit(groupTripId: Types.ObjectId | string): Promise<SplitResult> {
    // Fetch all expenses for the group trip
    const expenses = await Expense.find({ groupTripId })
      .populate('payerId', 'name')
      .populate('involvedMemberIds', 'name');

    if (expenses.length === 0) {
      return {
        totalExpenses: 0,
        perPersonAverage: 0,
        balances: [],
        settlements: []
      };
    }

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Track paid and owes for each member
    const memberBalances = new Map<string, { name: string; paid: number; owes: number }>();

    // Initialize member balances
    for (const expense of expenses) {
      const payerId = expense.payerId._id.toString();
      const payerName = (expense.payerId as any).name;

      if (!memberBalances.has(payerId)) {
        memberBalances.set(payerId, { name: payerName, paid: 0, owes: 0 });
      }

      // Track what this person paid
      const payerBalance = memberBalances.get(payerId)!;
      payerBalance.paid += expense.amount;

      // Calculate split among involved members
      const splitAmount = expense.amount / expense.involvedMemberIds.length;

      for (const member of expense.involvedMemberIds) {
        const memberId = member._id.toString();
        const memberName = (member as any).name;

        if (!memberBalances.has(memberId)) {
          memberBalances.set(memberId, { name: memberName, paid: 0, owes: 0 });
        }

        const memberBalance = memberBalances.get(memberId)!;
        memberBalance.owes += splitAmount;
      }
    }

    // Calculate net balances
    const balances: MemberBalance[] = [];
    const creditors: { userId: string; name: string; amount: number }[] = [];
    const debtors: { userId: string; name: string; amount: number }[] = [];

    for (const [userId, { name, paid, owes }] of memberBalances.entries()) {
      const netBalance = paid - owes;

      balances.push({
        userId,
        name,
        balance: Number(netBalance.toFixed(2)),
        status: netBalance > 0.01 ? 'owed' : netBalance < -0.01 ? 'owes' : 'settled'
      });

      if (netBalance > 0.01) {
        creditors.push({ userId, name, amount: netBalance });
      } else if (netBalance < -0.01) {
        debtors.push({ userId, name, amount: -netBalance });
      }
    }

    // Calculate settlements using greedy algorithm
    const settlements: Settlement[] = [];
    const sortedCreditors = [...creditors].sort((a, b) => b.amount - a.amount);
    const sortedDebtors = [...debtors].sort((a, b) => b.amount - a.amount);

    let i = 0;
    let j = 0;

    while (i < sortedCreditors.length && j < sortedDebtors.length) {
      const creditor = sortedCreditors[i];
      const debtor = sortedDebtors[j];

      const settlementAmount = Math.min(creditor.amount, debtor.amount);

      settlements.push({
        from: debtor.userId,
        fromName: debtor.name,
        to: creditor.userId,
        toName: creditor.name,
        amount: Number(settlementAmount.toFixed(2))
      });

      creditor.amount -= settlementAmount;
      debtor.amount -= settlementAmount;

      if (creditor.amount < 0.01) i++;
      if (debtor.amount < 0.01) j++;
    }

    const uniqueMembers = memberBalances.size;
    const perPersonAverage = totalExpenses / uniqueMembers;

    return {
      totalExpenses: Number(totalExpenses.toFixed(2)),
      perPersonAverage: Number(perPersonAverage.toFixed(2)),
      balances: balances.sort((a, b) => b.balance - a.balance),
      settlements
    };
  }
}

export const splitBudgetService = new SplitBudgetService();
