import { getCalendarEntryForType, shiftDateKey } from '@/data/calendar2026';

export type FastLevel = 'strict' | 'oil' | 'fish' | 'none';

export type FastDay = {
  level: FastLevel;
  title: string;
  description: string;
  note?: string;
};

export type Recipe = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  level: FastLevel;
  ingredients: string[];
  steps: string[];
  translations: Record<'en' | 'el', RecipeTranslation>;
};

export type RecipeTranslation = {
  title: string;
  subtitle: string;
  time: string;
  ingredients: string[];
  steps: string[];
};

const specialDays: Record<string, FastDay> = {
  '2026-01-05': { level: 'strict', title: 'صوم الظهور الإلهي', description: 'صوم استعدادًا لعيد الظهور الإلهي، مع طعام نباتي بسيط.', note: 'تُراعى إرشادات الأب الروحي والحالة الصحية.' },
  '2026-01-18': { level: 'none', title: 'لا صوم اليوم', description: 'اليوم منحلّ من الصوم احتفالًا بعيد الظهور الإلهي.' },
  '2026-02-16': { level: 'strict', title: 'بدء الصوم الكبير', description: 'بداية مسيرة الصوم الكبير بالصلاة والتوبة والرحمة.', note: 'الصوم ممارسة روحية تُعاش بإرشاد الكنيسة.' },
  '2026-04-12': { level: 'none', title: 'عيد القيامة المجيدة', description: 'فرح القيامة: لا صوم اليوم.' },
  '2026-05-29': { level: 'strict', title: 'صوم الرسل', description: 'نعيش صوم الرسل بالصلاة وخدمة القريب.' },
  '2026-08-01': { level: 'strict', title: 'صوم السيدة العذراء', description: 'بداية صوم رقاد والدة الإله، وهو صوم نباتي.', note: 'تختلف بعض التفاصيل الرعائية بحسب الرعية.' },
  '2026-08-06': { level: 'fish', title: 'عيد تجلي الرب', description: 'يُسمح بالسمك احتفالًا بعيد التجلي.', note: 'السمك المسموح لا يلغي روح الصلاة والاعتدال.' },
  '2026-08-15': { level: 'none', title: 'رقاد والدة الإله', description: 'عيد مبارك، لا صوم اليوم.' },
  '2026-11-15': { level: 'strict', title: 'بدء صوم الميلاد', description: 'بداية الاستعداد لميلاد الرب بالصلاة والصوم والصدقة.' },
  '2026-12-25': { level: 'none', title: 'عيد ميلاد الرب', description: 'فرح الميلاد: لا صوم اليوم.' },
};

const recipes: Recipe[] = [
  {
    id: 'lentil-soup',
    title: 'شوربة العدس الدافئة',
    subtitle: 'غنية ومشبعة من دون زيت',
    time: '٣٥ دقيقة',
    level: 'strict',
    ingredients: ['كوب عدس أحمر', 'بصلة مفرومة', 'جزرتان', 'كمون وملح', '٦ أكواب ماء'],
    steps: ['اغسل العدس وضعه مع الخضار والماء في قدر.', 'اتركه يغلي ثم خفف النار حتى ينضج.', 'أضف الكمون والملح واطحنه حسب الرغبة.'],
    translations: {
      en: {
        title: 'Warm lentil soup',
        subtitle: 'Hearty, simple, and oil-free',
        time: '35 min',
        ingredients: ['1 cup red lentils', '1 chopped onion', '2 carrots', 'Cumin and salt', '6 cups water'],
        steps: ['Rinse the lentils and add them to a pot with the vegetables and water.', 'Bring to a boil, then lower the heat and simmer until tender.', 'Season with cumin and salt, then blend if desired.'],
      },
      el: {
        title: 'Ζεστή σούπα φακής',
        subtitle: 'Χορταστική, απλή και χωρίς λάδι',
        time: '35 λεπτά',
        ingredients: ['1 φλιτζάνι κόκκινες φακές', '1 ψιλοκομμένο κρεμμύδι', '2 καρότα', 'Κύμινο και αλάτι', '6 φλιτζάνια νερό'],
        steps: ['Ξεπλύνετε τις φακές και βάλτε τες σε κατσαρόλα με τα λαχανικά και το νερό.', 'Αφήστε να πάρει βράση, χαμηλώστε τη φωτιά και μαγειρέψτε μέχρι να μαλακώσουν.', 'Προσθέστε κύμινο και αλάτι και πολτοποιήστε, αν θέλετε.'],
      },
    },
  },
  {
    id: 'olive-pasta',
    title: 'معكرونة بالخضار والزيتون',
    subtitle: 'طبق سريع مسموح فيه الزيت',
    time: '٢٥ دقيقة',
    level: 'oil',
    ingredients: ['معكرونة', 'كوسا وفلفل ملون', 'زيت زيتون', 'زيتون أسود', 'ثوم وريحان'],
    steps: ['اسلق المعكرونة واحتفظ بقليل من ماء السلق.', 'شوّح الخضار بالزيت والثوم حتى تلين.', 'اخلط المعكرونة مع الخضار والزيتون والريحان.'],
    translations: {
      en: {
        title: 'Vegetable and olive pasta',
        subtitle: 'A quick dish with olive oil',
        time: '25 min',
        ingredients: ['Pasta', 'Zucchini and bell pepper', 'Olive oil', 'Black olives', 'Garlic and basil'],
        steps: ['Cook the pasta and reserve a little of the cooking water.', 'Sauté the vegetables with olive oil and garlic until tender.', 'Toss the pasta with the vegetables, olives, and basil.'],
      },
      el: {
        title: 'Ζυμαρικά με λαχανικά και ελιές',
        subtitle: 'Ένα γρήγορο πιάτο με ελαιόλαδο',
        time: '25 λεπτά',
        ingredients: ['Ζυμαρικά', 'Κολοκύθι και πιπεριά', 'Ελαιόλαδο', 'Μαύρες ελιές', 'Σκόρδο και βασιλικός'],
        steps: ['Βράστε τα ζυμαρικά και κρατήστε λίγο από το νερό τους.', 'Σοτάρετε τα λαχανικά με ελαιόλαδο και σκόρδο μέχρι να μαλακώσουν.', 'Ανακατέψτε τα ζυμαρικά με τα λαχανικά, τις ελιές και τον βασιλικό.'],
      },
    },
  },
  {
    id: 'baked-fish',
    title: 'سمك مشوي بالليمون',
    subtitle: 'وصفة احتفالية خفيفة',
    time: '٣٠ دقيقة',
    level: 'fish',
    ingredients: ['قطعة سمك أبيض', 'ليمون', 'ثوم', 'زيت زيتون', 'بقدونس وملح'],
    steps: ['تبّل السمك بالليمون والثوم والملح.', 'ضعه في صينية مع القليل من الزيت.', 'اخبزه حتى ينضج وقدمه مع سلطة موسمية.'],
    translations: {
      en: {
        title: 'Baked fish with lemon',
        subtitle: 'A light dish for a special occasion',
        time: '30 min',
        ingredients: ['1 white fish fillet', 'Lemon', 'Garlic', 'Olive oil', 'Parsley and salt'],
        steps: ['Season the fish with lemon, garlic, and salt.', 'Place it in a baking dish with a little olive oil.', 'Bake until cooked through and serve with a seasonal salad.'],
      },
      el: {
        title: 'Ψητό ψάρι με λεμόνι',
        subtitle: 'Ένα ελαφρύ πιάτο για ξεχωριστή περίσταση',
        time: '30 λεπτά',
        ingredients: ['1 φιλέτο λευκού ψαριού', 'Λεμόνι', 'Σκόρδο', 'Ελαιόλαδο', 'Μαϊντανός και αλάτι'],
        steps: ['Αλατοπιπερώστε το ψάρι με λεμόνι και σκόρδο.', 'Βάλτε το σε ταψί με λίγο ελαιόλαδο.', 'Ψήστε μέχρι να μαγειρευτεί και σερβίρετε με σαλάτα εποχής.'],
      },
    },
  },
  {
    id: 'mujadara',
    title: 'مجدرة الأرز والعدس',
    subtitle: 'طبق شامي مشبع مع بصل محمّر',
    time: '٤٥ دقيقة',
    level: 'oil',
    ingredients: ['كوب عدس أخضر أو بني', 'كوب أرز مغسول', 'بصلتان متوسطتان مقطعتان شرائح', '٣ ملاعق كبيرة زيت زيتون', 'ملعقة صغيرة كمون', '٤ أكواب ماء وملح'],
    steps: ['اغسل العدس واسلقه في الماء نحو ١٥ دقيقة حتى يطرى قليلًا.', 'أضف الأرز والكمون والملح، وخفف النار واطهه حتى ينضج الأرز.', 'حمّر البصل بزيت الزيتون على نار متوسطة حتى يصبح ذهبيًا.', 'قدّم المجدرة مع البصل المحمّر.'],
    translations: {
      en: {
        title: 'Mujadara rice and lentils',
        subtitle: 'A hearty Levantine dish with golden onions',
        time: '45 min',
        ingredients: ['1 cup green or brown lentils', '1 cup rinsed rice', '2 medium onions, thinly sliced', '3 tbsp olive oil', '1 tsp cumin', '4 cups water and salt'],
        steps: ['Rinse the lentils and simmer them in water for about 15 minutes, until slightly tender.', 'Add the rice, cumin, and salt. Lower the heat and cook until the rice is tender.', 'Cook the onions in olive oil over medium heat until golden.', 'Serve the mujadara topped with the golden onions.'],
      },
      el: {
        title: 'Μουτζάνταρα με ρύζι και φακές',
        subtitle: 'Χορταστικό λεβαντίνικο πιάτο με καραμελωμένα κρεμμύδια',
        time: '45 λεπτά',
        ingredients: ['1 φλιτζάνι πράσινες ή καφέ φακές', '1 φλιτζάνι ρύζι, ξεπλυμένο', '2 μέτρια κρεμμύδια σε λεπτές φέτες', '3 κ.σ. ελαιόλαδο', '1 κ.γ. κύμινο', '4 φλιτζάνια νερό και αλάτι'],
        steps: ['Ξεπλύνετε τις φακές και σιγοβράστε τες για περίπου 15 λεπτά, μέχρι να μαλακώσουν ελαφρά.', 'Προσθέστε το ρύζι, το κύμινο και το αλάτι. Χαμηλώστε τη φωτιά και μαγειρέψτε μέχρι να μαλακώσει το ρύζι.', 'Σοτάρετε τα κρεμμύδια με ελαιόλαδο σε μέτρια φωτιά μέχρι να χρυσίσουν.', 'Σερβίρετε τη μουτζάνταρα με τα χρυσά κρεμμύδια από πάνω.'],
      },
    },
  },
  {
    id: 'hummus-tahini',
    title: 'حمص بالطحينة',
    subtitle: 'غموس كريمي بالليمون والثوم',
    time: '١٥ دقيقة',
    level: 'oil',
    ingredients: ['علبتان حمص مسلوق ومصفّى (نحو ٤٨٠ غ)', 'ثلث كوب طحينة', 'ربع كوب عصير ليمون', 'فص ثوم', 'نصف ملعقة صغيرة ملح', '٢ إلى ٤ ملاعق كبيرة ماء بارد', 'زيت زيتون للتقديم حسب الرغبة'],
    steps: ['ضع الحمص والطحينة والليمون والثوم والملح في الخلاط.', 'اخلط المكونات، وأضف الماء البارد تدريجيًا حتى يصبح القوام ناعمًا.', 'تذوّق الغموس واضبط الملح والليمون، ثم قدّمه مع رشة زيت زيتون إن رغبت.'],
    translations: {
      en: {
        title: 'Hummus with tahini',
        subtitle: 'A creamy dip with lemon and garlic',
        time: '15 min',
        ingredients: ['2 cans cooked chickpeas, drained (about 480 g)', '⅓ cup tahini', '¼ cup lemon juice', '1 garlic clove', '½ tsp salt', '2–4 tbsp cold water', 'Olive oil for serving, optional'],
        steps: ['Add the chickpeas, tahini, lemon juice, garlic, and salt to a food processor.', 'Blend, adding cold water a little at a time, until smooth and creamy.', 'Taste and adjust the salt and lemon. Serve with a drizzle of olive oil if desired.'],
      },
      el: {
        title: 'Χούμους με ταχίνι',
        subtitle: 'Κρεμώδες ντιπ με λεμόνι και σκόρδο',
        time: '15 λεπτά',
        ingredients: ['2 κονσέρβες βρασμένα ρεβίθια, στραγγισμένα (περίπου 480 γρ.)', '⅓ φλιτζάνι ταχίνι', '¼ φλιτζάνι χυμό λεμονιού', '1 σκελίδα σκόρδο', '½ κ.γ. αλάτι', '2–4 κ.σ. κρύο νερό', 'Ελαιόλαδο για το σερβίρισμα, προαιρετικά'],
        steps: ['Βάλτε τα ρεβίθια, το ταχίνι, τον χυμό λεμονιού, το σκόρδο και το αλάτι στο μπλέντερ.', 'Χτυπήστε τα υλικά και προσθέστε λίγο λίγο κρύο νερό μέχρι να γίνει λείο και κρεμώδες.', 'Δοκιμάστε και διορθώστε το αλάτι και το λεμόνι. Αν θέλετε, σερβίρετε με λίγο ελαιόλαδο.'],
      },
    },
  },
  {
    id: 'spinach-chickpea-stew',
    title: 'يخنة السبانخ والحمص',
    subtitle: 'يخنة خفيفة بالليمون والكزبرة',
    time: '٣٠ دقيقة',
    level: 'oil',
    ingredients: ['٥٠٠ غ سبانخ طازجة أو مجمّدة', 'علبة حمص مسلوق ومصفّى', 'بصلة مفرومة', 'فصّا ثوم مهروسان', 'ملعقتان كبيرتان زيت زيتون', 'ملعقة صغيرة كزبرة مطحونة', 'كوب مرق خضار أو ماء', 'عصير نصف ليمونة وملح'],
    steps: ['حمّر البصل بزيت الزيتون حتى يلين، ثم أضف الثوم والكزبرة وحرّك دقيقة.', 'أضف الحمص والمرق واترك المزيج يغلي بهدوء نحو ١٠ دقائق.', 'أضف السبانخ على دفعات واطهها حتى تذبل وتنضج.', 'أطفئ النار وأضف عصير الليمون والملح، ثم قدّم اليخنة دافئة.'],
    translations: {
      en: {
        title: 'Spinach and chickpea stew',
        subtitle: 'A light stew with lemon and coriander',
        time: '30 min',
        ingredients: ['500 g fresh or frozen spinach', '1 can cooked chickpeas, drained', '1 chopped onion', '2 crushed garlic cloves', '2 tbsp olive oil', '1 tsp ground coriander', '1 cup vegetable broth or water', 'Juice of ½ lemon and salt'],
        steps: ['Soften the onion in olive oil, then add the garlic and coriander and stir for 1 minute.', 'Add the chickpeas and broth; simmer gently for about 10 minutes.', 'Add the spinach in batches and cook until wilted and tender.', 'Turn off the heat, stir in the lemon juice and salt, and serve warm.'],
      },
      el: {
        title: 'Στιφάδο με σπανάκι και ρεβίθια',
        subtitle: 'Ελαφρύ φαγητό με λεμόνι και κόλιανδρο',
        time: '30 λεπτά',
        ingredients: ['500 γρ. φρέσκο ή κατεψυγμένο σπανάκι', '1 κονσέρβα βρασμένα ρεβίθια, στραγγισμένα', '1 ψιλοκομμένο κρεμμύδι', '2 λιωμένες σκελίδες σκόρδο', '2 κ.σ. ελαιόλαδο', '1 κ.γ. τριμμένο κόλιανδρο', '1 φλιτζάνι ζωμό λαχανικών ή νερό', 'Χυμός από ½ λεμόνι και αλάτι'],
        steps: ['Σοτάρετε το κρεμμύδι στο ελαιόλαδο μέχρι να μαλακώσει. Προσθέστε το σκόρδο και τον κόλιανδρο και ανακατέψτε για 1 λεπτό.', 'Προσθέστε τα ρεβίθια και τον ζωμό και σιγοβράστε για περίπου 10 λεπτά.', 'Ρίξτε το σπανάκι σταδιακά και μαγειρέψτε μέχρι να μαραθεί και να μαλακώσει.', 'Σβήστε τη φωτιά, προσθέστε το λεμόνι και το αλάτι και σερβίρετε ζεστό.'],
      },
    },
  },
  {
    id: 'lemon-oregano-potatoes',
    title: 'بطاطا بالليمون والأوريغانو',
    subtitle: 'بطاطا طرية من الداخل ومحمّرة من الخارج',
    time: '٥٥ دقيقة',
    level: 'oil',
    ingredients: ['كيلوغرام بطاطا مقطّعة أرباعًا', '٣ ملاعق كبيرة زيت زيتون', 'عصير ليمونة', '٣ فصوص ثوم مهروسة', 'ملعقة صغيرة أوريغانو', 'كوب ماء دافئ', 'ملح وفلفل أسود'],
    steps: ['سخّن الفرن إلى ٢٠٠ درجة مئوية وضع البطاطا في صينية.', 'اخلط الزيت والليمون والثوم والأوريغانو والماء والملح، ثم اسكبها فوق البطاطا.', 'اخبز البطاطا ٤٠ دقيقة مع تقليبها مرة، ثم ارفع الحرارة قليلًا حتى تتحمّر.', 'قدّمها ساخنة مع ما تبقّى من الصلصة في الصينية.'],
    translations: {
      en: {
        title: 'Lemon and oregano potatoes',
        subtitle: 'Tender inside with crisp, golden edges',
        time: '55 min',
        ingredients: ['1 kg potatoes, cut into wedges', '3 tbsp olive oil', 'Juice of 1 lemon', '3 crushed garlic cloves', '1 tsp oregano', '1 cup warm water', 'Salt and black pepper'],
        steps: ['Heat the oven to 200°C (400°F) and place the potatoes in a baking dish.', 'Mix the oil, lemon, garlic, oregano, water, salt, and pepper, then pour over the potatoes.', 'Bake for 40 minutes, turning once, then raise the heat briefly to brown the edges.', 'Serve hot with the pan juices.'],
      },
      el: {
        title: 'Πατάτες λεμονάτες με ρίγανη',
        subtitle: 'Μαλακές μέσα και ροδοψημένες έξω',
        time: '55 λεπτά',
        ingredients: ['1 κιλό πατάτες κομμένες σε κυδωνάτες', '3 κ.σ. ελαιόλαδο', 'Χυμός από 1 λεμόνι', '3 λιωμένες σκελίδες σκόρδο', '1 κ.γ. ρίγανη', '1 φλιτζάνι χλιαρό νερό', 'Αλάτι και μαύρο πιπέρι'],
        steps: ['Προθερμάνετε τον φούρνο στους 200°C και βάλτε τις πατάτες σε ταψί.', 'Ανακατέψτε το λάδι, το λεμόνι, το σκόρδο, τη ρίγανη, το νερό, το αλάτι και το πιπέρι και περιχύστε τις πατάτες.', 'Ψήστε για 40 λεπτά, γυρίζοντάς τες μία φορά, και στο τέλος δυναμώστε λίγο τη θερμοκρασία για να ροδίσουν.', 'Σερβίρετε ζεστές με τα υγρά του ταψιού.'],
      },
    },
  },
  {
    id: 'tabbouleh',
    title: 'تبولة شامية',
    subtitle: 'سلطة بقدونس منعشة بالليمون والبرغل',
    time: '٣٠ دقيقة',
    level: 'oil',
    ingredients: ['ربع كوب برغل ناعم', 'حبتا بندورة ناضجتان مفرومتان', 'حزمة كبيرة بقدونس مفروم ناعمًا', 'نصف حزمة نعناع مفروم', 'حبتا خيار مفرومتان', '٣ ملاعق كبيرة زيت زيتون', 'عصير ليمونة وملح'],
    steps: ['انقع البرغل الناعم في عصير البندورة وعصير نصف الليمونة نحو ١٠ دقائق.', 'افرُم البقدونس والنعناع والخيار والبندورة فرمًا ناعمًا.', 'اخلط الخضار بالبرغل وأضف زيت الزيتون وبقية الليمون والملح.', 'اترك السلطة ترتاح ١٠ دقائق وقدّمها باردة.'],
    translations: {
      en: {
        title: 'Levantine tabbouleh',
        subtitle: 'A fresh parsley salad with lemon and bulgur',
        time: '30 min',
        ingredients: ['¼ cup fine bulgur', '2 ripe tomatoes, diced', '1 large bunch parsley, finely chopped', '½ bunch mint, chopped', '2 cucumbers, diced', '3 tbsp olive oil', 'Juice of 1 lemon and salt'],
        steps: ['Soak the fine bulgur in the tomato juices and the juice of half a lemon for about 10 minutes.', 'Finely chop the parsley, mint, cucumber, and tomatoes.', 'Toss the vegetables with the bulgur, olive oil, remaining lemon juice, and salt.', 'Let the salad rest for 10 minutes and serve chilled.'],
      },
      el: {
        title: 'Λεβαντίνικη ταμπουλέ',
        subtitle: 'Δροσερή σαλάτα μαϊντανού με λεμόνι και πλιγούρι',
        time: '30 λεπτά',
        ingredients: ['¼ φλιτζάνι ψιλό πλιγούρι', '2 ώριμες ντομάτες κομμένες σε κύβους', '1 μεγάλο ματσάκι μαϊντανό, ψιλοκομμένο', '½ ματσάκι δυόσμο, ψιλοκομμένο', '2 αγγούρια κομμένα σε κύβους', '3 κ.σ. ελαιόλαδο', 'Χυμός από 1 λεμόνι και αλάτι'],
        steps: ['Μουλιάστε το ψιλό πλιγούρι στους χυμούς της ντομάτας και στον χυμό από μισό λεμόνι για περίπου 10 λεπτά.', 'Ψιλοκόψτε τον μαϊντανό, τον δυόσμο, τα αγγούρια και τις ντομάτες.', 'Ανακατέψτε τα λαχανικά με το πλιγούρι, το ελαιόλαδο, το υπόλοιπο λεμόνι και το αλάτι.', 'Αφήστε τη σαλάτα να σταθεί για 10 λεπτά και σερβίρετε δροσερή.'],
      },
    },
  },
  {
    id: 'stuffed-eggplant',
    title: 'باذنجان محشي بالأرز',
    subtitle: 'باذنجان صغير بحشوة الأرز والأعشاب',
    time: '٦٠ دقيقة',
    level: 'oil',
    ingredients: ['٦ حبات باذنجان صغيرة', 'كوب أرز قصير الحبة مغسول', 'بصلة مفرومة', 'حبتا بندورة مفرومتان', 'ملعقتان كبيرتان معجون بندورة', 'ملعقتان كبيرتان زيت زيتون', 'ملعقتان كبيرتان بقدونس مفروم', 'كوبان مرق خضار أو ماء وملح'],
    steps: ['اغسل الباذنجان وأزل جزءًا من اللب مع إبقاء الجوانب متماسكة.', 'اخلط الأرز مع البصل والبندورة ومعجون البندورة والزيت والبقدونس والملح.', 'احشُ حبات الباذنجان حتى ثلاثة أرباعها ورتّبها في قدر عميق.', 'أضف المرق، وغطِّ القدر واطهُ على نار هادئة نحو ٤٠ دقيقة حتى ينضج الأرز والباذنجان.'],
    translations: {
      en: {
        title: 'Rice-stuffed eggplant',
        subtitle: 'Baby eggplants filled with rice and herbs',
        time: '60 min',
        ingredients: ['6 small eggplants', '1 cup rinsed short-grain rice', '1 chopped onion', '2 diced tomatoes', '2 tbsp tomato paste', '2 tbsp olive oil', '2 tbsp chopped parsley', '2 cups vegetable broth or water and salt'],
        steps: ['Wash the eggplants and remove some of the center flesh, leaving the sides intact.', 'Mix the rice with the onion, tomatoes, tomato paste, olive oil, parsley, and salt.', 'Fill each eggplant about three-quarters full and arrange them in a deep pot.', 'Add the broth, cover, and simmer gently for about 40 minutes, until the rice and eggplant are tender.'],
      },
      el: {
        title: 'Μελιτζάνες γεμιστές με ρύζι',
        subtitle: 'Μικρές μελιτζάνες γεμισμένες με ρύζι και μυρωδικά',
        time: '60 λεπτά',
        ingredients: ['6 μικρές μελιτζάνες', '1 φλιτζάνι ρύζι κοντόκοκκο, ξεπλυμένο', '1 ψιλοκομμένο κρεμμύδι', '2 ντομάτες κομμένες σε κύβους', '2 κ.σ. πελτέ ντομάτας', '2 κ.σ. ελαιόλαδο', '2 κ.σ. ψιλοκομμένο μαϊντανό', '2 φλιτζάνια ζωμό λαχανικών ή νερό και αλάτι'],
        steps: ['Πλύνετε τις μελιτζάνες και αφαιρέστε λίγη από την ψίχα τους, αφήνοντας τα τοιχώματα άθικτα.', 'Ανακατέψτε το ρύζι με το κρεμμύδι, τις ντομάτες, τον πελτέ, το ελαιόλαδο, τον μαϊντανό και το αλάτι.', 'Γεμίστε κάθε μελιτζάνα μέχρι τα τρία τέταρτα και τοποθετήστε τες σε βαθιά κατσαρόλα.', 'Προσθέστε τον ζωμό, σκεπάστε και σιγοβράστε για περίπου 40 λεπτά, μέχρι να μαλακώσουν το ρύζι και οι μελιτζάνες.'],
      },
    },
  },
];

export function getAllRecipes() {
  return recipes;
}

export function getFastForDate(date: string, calendarType: 'gregorian' | 'julian'): FastDay {
  const canonicalDate = calendarType === 'julian' ? shiftDateKey(date, 13) : date;
  if (specialDays[canonicalDate]) return specialDays[canonicalDate];

  const entry = getCalendarEntryForType(date, calendarType);
  if (entry.fast?.includes('صوم كامل')) {
    return { level: 'strict', title: entry.fast, description: 'يوم صوم كامل بحسب الرزنامة الكنسية.' };
  }
  if (entry.fast) {
    return { level: 'strict', title: entry.fast, description: 'نعيش هذا الصوم بالصلاة والاعتدال والرحمة.' };
  }

  const weekday = new Date(`${canonicalDate}T12:00:00Z`).getUTCDay();
  if (weekday === 3 || weekday === 5) {
    return { level: 'oil', title: 'صوم الأربعاء والجمعة', description: 'صوم تذكاري أسبوعي، ويُسمح بالزيت في هذا الدليل المبدئي.' };
  }
  return { level: 'none', title: 'لا صوم اليوم', description: 'يمكن تناول الطعام باعتدال وشكر، مع الحفاظ على روح الصلاة.' };
}

export function getRecipesForFast(level: FastLevel) {
  if (level === 'none') return recipes;
  return recipes.filter((recipe) => recipe.level === level || (level === 'oil' && recipe.level === 'strict') || (level === 'fish' && recipe.level !== 'none'));
}

export const fastLevelLabels: Record<FastLevel, string> = {
  strict: 'صوم صارم',
  oil: 'السماح بالزيت',
  fish: 'السماح بالسمك',
  none: 'لا صوم',
};