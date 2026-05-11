/**
 * seed-arabic-names.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * يملأ حقول nameAr / cityAr / descriptionAr لأشهر الأماكن في قاعدة البيانات
 * بناءً على مطابقة الاسم الإنجليزي (case-insensitive substring match)
 *
 * الاستخدام:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-arabic-names.ts
 * أو بعد البناء:
 *   node dist/scripts/seed-arabic-names.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Place } from '../src/models/Place';

dotenv.config();

// ─── خريطة الأماكن المعروفة ─────────────────────────────────────────────────
// المفتاح: جزء من الاسم الإنجليزي (lowercase) → البيانات العربية
const ARABIC_DATA: Record<string, { nameAr: string; cityAr?: string; descriptionAr?: string }> = {
  // ── الرياض ──────────────────────────────────────────────────────────────
  'wadi hanifa':         { nameAr: 'وادي حنيفة', cityAr: 'الرياض', descriptionAr: 'أطول أودية الجزيرة العربية، يمتد 120 كم عبر الرياض بحدائق خضراء وممرات للمشي.' },
  'al bujairi':         { nameAr: 'حديقة البجيري', cityAr: 'الرياض', descriptionAr: 'حديقة تراثية راقية بجانب قصر الطريف في الدرعية، تجمع بين الثقافة والطعام.' },
  'diriyah':            { nameAr: 'الدرعية', cityAr: 'الرياض', descriptionAr: 'عاصمة الدولة السعودية الأولى، موقع تراثي عالمي مسجل في اليونسكو.' },
  'edge of the world':  { nameAr: 'حافة العالم', cityAr: 'الرياض', descriptionAr: 'جرف صخري مهيب على ارتفاع 300 متر يطل على صحراء نجد، أشهر وجهات الهايكينج في الرياض.' },
  'king fahd':          { nameAr: 'حديقة الملك فهد', cityAr: 'الرياض', descriptionAr: 'من أكبر الحدائق العامة في الرياض، بمساحة شاسعة وبحيرات اصطناعية ومناطق ترفيه.' },
  'kingdom centre':     { nameAr: 'برج المملكة', cityAr: 'الرياض', descriptionAr: 'أيقونة الرياض المعمارية بارتفاع 302 متر، يضم جسر المشاة السماوي والمول والفندق.' },
  'riyadh zoo':         { nameAr: 'حديقة حيوانات الرياض', cityAr: 'الرياض', descriptionAr: 'أكبر حديقة حيوانات في المملكة، تضم أكثر من 1500 حيوان من 165 نوعاً.' },
  'national museum':    { nameAr: 'المتحف الوطني', cityAr: 'الرياض', descriptionAr: 'يروي تاريخ المملكة من عصور ما قبل التاريخ حتى اليوم عبر 8 قاعات تفاعلية.' },
  'murabba palace':     { nameAr: 'قصر المربع', cityAr: 'الرياض', descriptionAr: 'قصر تاريخي بناه الملك عبدالعزيز عام 1936، مثال رائع للعمارة النجدية.' },
  'al faisaliah':       { nameAr: 'برج الفيصلية', cityAr: 'الرياض', descriptionAr: 'أول ناطحة سحاب في المملكة العربية السعودية، يتميز بكرته الزجاجية الذهبية في قمته.' },
  'boulevard city':     { nameAr: 'بوليفارد سيتي', cityAr: 'الرياض', descriptionAr: 'وجهة ترفيهية متكاملة في قلب الرياض، تضم المطاعم والمحلات والحفلات.' },
  'riyadh season':      { nameAr: 'موسم الرياض', cityAr: 'الرياض', descriptionAr: 'أكبر موسم ترفيهي في العالم، يقام سنوياً بعشرات الفعاليات والمناطق الترفيهية.' },
  'al hamra mall':      { nameAr: 'الحمراء مول', cityAr: 'الرياض', descriptionAr: 'مجمع تجاري راقٍ في غرب الرياض يضم أفضل العلامات التجارية.' },
  'sky bridge':         { nameAr: 'الجسر السماوي', cityAr: 'الرياض', descriptionAr: 'أعلى جسر مشاة في الرياض داخل برج المملكة، يوفر منظراً بانورامياً خلاباً.' },
  'wetland':            { nameAr: 'الأراضي الرطبة', cityAr: 'الرياض', descriptionAr: 'منطقة بيئية فريدة في وادي حنيفة تأوي طيوراً مهاجرة ونباتات مائية نادرة.' },

  // ── جدة ────────────────────────────────────────────────────────────────
  'al balad':           { nameAr: 'البلد التاريخي', cityAr: 'جدة', descriptionAr: 'قلب جدة القديمة، موقع تراثي مسجل في اليونسكو بأبراجه المشربية المميزة.' },
  'king fahd fountain': { nameAr: 'نافورة الملك فهد', cityAr: 'جدة', descriptionAr: 'أعلى نافورة في العالم بارتفاع 312 متراً، تزين كورنيش جدة الشهير.' },
  'corniche':           { nameAr: 'كورنيش جدة', cityAr: 'جدة', descriptionAr: 'واجهة بحرية بطول 30 كم تطل على البحر الأحمر، رمز الحياة الاجتماعية في جدة.' },
  'floating mosque':    { nameAr: 'مسجد الرحمة العائم', cityAr: 'جدة', descriptionAr: 'مسجد أيقوني يبدو وكأنه يطفو على سطح البحر الأحمر عند ارتفاع المد.' },
  'red sea mall':       { nameAr: 'ريد سي مول', cityAr: 'جدة', descriptionAr: 'من أشهر مراكز التسوق في جدة بمتاجر متنوعة وواجهة بحرية.' },

  // ── العُلا ──────────────────────────────────────────────────────────────
  'hegra':              { nameAr: 'الحِجر (مدائن صالح)', cityAr: 'العُلا', descriptionAr: 'أول موقع سعودي مسجل في اليونسكو، أبرز مواقع الحضارة النبطية في العالم.' },
  'dadan':              { nameAr: 'دادان', cityAr: 'العُلا', descriptionAr: 'عاصمة مملكتَي دادان ولحيان القديمتين، موقع أثري استثنائي في العُلا.' },
  'elephant rock':      { nameAr: 'صخرة الفيل', cityAr: 'العُلا', descriptionAr: 'تكوين صخري طبيعي بديع يشبه الفيل، من أكثر وجهات العُلا تصويراً.' },
  'jabal ikmah':        { nameAr: 'جبل إكمه', cityAr: 'العُلا', descriptionAr: 'مكتبة حجرية مفتوحة تضم آلاف النقوش والكتابات النبطية والدادانية.' },
  'alula':              { nameAr: 'العُلا', cityAr: 'العُلا', descriptionAr: 'واحة تاريخية في شمال غرب المملكة، مهد الحضارات العريقة وبوابة التراث الإنساني.' },

  // ── أبها ────────────────────────────────────────────────────────────────
  'asir national park': { nameAr: 'حديقة عسير الوطنية', cityAr: 'أبها', descriptionAr: 'أكبر المتنزهات الوطنية في المملكة، تضم الجبال الخضراء والطبيعة الخلابة.' },
  'habala':             { nameAr: 'قرية حبالة المعلقة', cityAr: 'أبها', descriptionAr: 'قرية تاريخية معلقة على حافة الجبل، تُعدّ من أغرب المواقع السياحية في المملكة.' },
  'al soudah':          { nameAr: 'جبل السودة', cityAr: 'أبها', descriptionAr: 'أعلى قمة في المملكة العربية السعودية بارتفاع 3015 متراً فوق سطح البحر.' },

  // ── تبوك / الشمال ──────────────────────────────────────────────────────
  'neom':               { nameAr: 'نيوم', cityAr: 'تبوك', descriptionAr: 'مدينة المستقبل الضخمة على ساحل البحر الأحمر، مشروع طموح لمدينة ذكية 100% متجددة.' },
  'tabuk castle':       { nameAr: 'قلعة تبوك', cityAr: 'تبوك', descriptionAr: 'قلعة تاريخية عثمانية تعود للقرن العاشر الهجري، شاهد على تاريخ المنطقة.' },
  'umluj':              { nameAr: 'أملج', cityAr: 'تبوك', descriptionAr: 'جزر مرجانية ساحرة على البحر الأحمر تُعدّ وجهة مثالية للغطس وصيد الأسماك.' },

  // ── الدمام / المنطقة الشرقية ────────────────────────────────────────────
  'half moon bay':      { nameAr: 'شاطئ نصف القمر', cityAr: 'الدمام', descriptionAr: 'شاطئ رملي خلاب على الخليج العربي، مفضل للعائلات والشواء وركوب الأمواج.' },
  'king fahd causeway': { nameAr: 'جسر الملك فهد', cityAr: 'الدمام', descriptionAr: 'الجسر العملاق الذي يربط المملكة بالبحرين بطول 25 كيلومتراً فوق الخليج.' },
};

// ─── خريطة المدن ────────────────────────────────────────────────────────────
const CITY_AR_MAP: Record<string, string> = {
  riyadh: 'الرياض', jeddah: 'جدة', mecca: 'مكة المكرمة',
  medina: 'المدينة المنورة', alula: 'العُلا', 'al ula': 'العُلا',
  abha: 'أبها', dammam: 'الدمام', taif: 'الطائف',
  yanbu: 'ينبع', tabuk: 'تبوك', hail: 'حائل',
  najran: 'نجران', jizan: 'جازان', khobar: 'الخبر',
  jubail: 'الجبيل', khamis: 'خميس مشيط', bisha: 'بيشة',
  qassim: 'القصيم', buraydah: 'بريدة', unayzah: 'عنيزة',
};

// ─── الدالة الرئيسية ─────────────────────────────────────────────────────────
async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('❌  MONGODB_URI غير محدد في ملف .env');

  console.log('🔌 جاري الاتصال بقاعدة البيانات...');
  await mongoose.connect(uri);
  console.log('✅ تم الاتصال\n');

  const places = await Place.find({});
  console.log(`📦 إجمالي الأماكن: ${places.length}\n`);

  let updated = 0;
  let skipped = 0;

  for (const place of places) {
    const nameLower = (place.name || '').toLowerCase();
    const cityLower = (place.city || '').toLowerCase();

    // 1️⃣ إيجاد البيانات العربية من الخريطة
    let match: { nameAr: string; cityAr?: string; descriptionAr?: string } | null = null;
    for (const [key, data] of Object.entries(ARABIC_DATA)) {
      if (nameLower.includes(key) || key.includes(nameLower.split(' ')[0])) {
        match = data;
        break;
      }
    }

    // 2️⃣ اسم المدينة بالعربية (حتى لو لم يُطابق خريطة الأماكن)
    const cityAr = match?.cityAr
      ?? CITY_AR_MAP[cityLower]
      ?? Object.entries(CITY_AR_MAP).find(([k]) => cityLower.includes(k))?.[1]
      ?? undefined;

    // 3️⃣ تحقق هل يحتاج تحديثاً؟
    const needsUpdate =
      (match?.nameAr && !place.nameAr) ||
      (cityAr && !(place as any).cityAr) ||
      (match?.descriptionAr && !place.descriptionAr);

    if (!needsUpdate) { skipped++; continue; }

    // 4️⃣ تطبيق التحديث
    const update: Record<string, string> = {};
    if (match?.nameAr && !place.nameAr)               update.nameAr        = match.nameAr;
    if (cityAr && !(place as any).cityAr)              update.cityAr        = cityAr;
    if (match?.descriptionAr && !place.descriptionAr) update.descriptionAr = match.descriptionAr;

    await Place.updateOne({ _id: place._id }, { $set: update });

    console.log(`  ✏️  "${place.name}" → "${update.nameAr || place.nameAr}" | ${update.cityAr || (place as any).cityAr || place.city}`);
    updated++;
  }

  // 5️⃣ تحديث المدن الباقية بدون nameAr مطابق (cityAr فقط)
  const cityOnlyResult = await Place.updateMany(
    { cityAr: { $exists: false } },
    [
      {
        $set: {
          cityAr: {
            $switch: {
              branches: Object.entries(CITY_AR_MAP).map(([en, ar]) => ({
                case: { $regexMatch: { input: { $toLower: '$city' }, regex: en } },
                then: ar,
              })),
              default: '',
            },
          },
        },
      },
    ]
  );

  console.log(`\n📊 النتائج:`);
  console.log(`  ✅ تم تحديث:      ${updated} مكان بالاسم العربي`);
  console.log(`  🏙️  تحديث المدن:   ${cityOnlyResult.modifiedCount} مكان بدون اسم عربي`);
  console.log(`  ⏭️  تم تخطي:       ${skipped} مكان (لديها بيانات بالفعل أو غير مطابقة)`);

  await mongoose.disconnect();
  console.log('\n🔌 تم قطع الاتصال. اكتمل التشغيل! 🎉');
}

main().catch(err => {
  console.error('❌ خطأ:', err.message);
  process.exit(1);
});
