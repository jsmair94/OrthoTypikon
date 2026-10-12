import type { Language } from '@/hooks/usePreferences';

export type MoreSection = 'privacy' | 'terms' | 'about' | 'contact';

type LegalSection = {
  title: string;
  body: string;
};

export const moreContent = {
  ar: {
    sectionTitle: 'معلومات التطبيق',
    privacy: 'سياسة الخصوصية',
    terms: 'الشروط والأحكام',
    about: 'من نحن',
    contactTitle: 'تواصل معنا',
    socialTitle: 'قنواتنا',
    socialPending: 'سيتم إضافة الروابط قريبًا',
    socialOpenFailed: 'تعذّر فتح رابط التواصل. حاول مرة أخرى.',
    contactForm: {
      intro: 'هذا النموذج غير مربوط بخدمة إرسال بعد. يمكنك تعبئة الحقول، لكن المعلومات لن تُرسل أو تُحفظ.',
      name: 'الاسم',
      email: 'البريد الإلكتروني',
      country: 'الدولة',
      chooseCountry: 'اختر دولة',
      searchCountry: 'ابحث عن دولة',
      noCountriesFound: 'لم يتم العثور على دول.',
      closeCountryPicker: 'إغلاق قائمة الدول',
      phone: 'رقم الهاتف',
      optional: '(اختياري)',
      dialCode: 'رمز الاتصال',
      chooseDialCode: 'اختر رمز البلد (اختياري)',
      searchDialCode: 'ابحث عن بلد أو رمز',
      customDialCode: 'استخدم الرمز',
      clearDialCode: 'بدون رمز بلد',
      closeDialCodePicker: 'إغلاق اختيار رمز البلد',
      message: 'ماذا تريد أن تخبرنا؟',
      submit: 'إرسال',
      submitNotice: 'لم يُرسل النموذج بعد؛ لم تُرسل بياناتك أو تُحفظ. سيتم تفعيل الإرسال لاحقًا.',
      required: 'هذا الحقل مطلوب.',
      invalidEmail: 'أدخل بريدًا إلكترونيًا صحيحًا.',
      invalidPhone: 'أدخل رقم هاتف صحيحًا.',
    },
    socials: {
      facebook: 'فيس بوك',
      instagram: 'إنستجرام',
    },
    privacyPage: {
      title: 'سياسة الخصوصية',
      intro:
        'نحترم خصوصيتك ونسعى إلى أن يكون OrthoTypikon مساحة روحية آمنة وهادئة. توضّح هذه السياسة ما قد يعالجه التطبيق وكيف نستخدمه.',
      updated: 'آخر تحديث: ٢ تشرين الأول ٢٠٢٦',
      sections: [
        {
          title: 'المعلومات التي قد يعالجها التطبيق',
          body:
            'يمكنك استخدام معظم أجزاء التطبيق من دون إنشاء حساب. قد يعالج التطبيق إعداداتك المحلية مثل اللغة ونوع التقويم والمظهر. وإذا استخدمت مجتمع الصلاة، فقد يعالج طلب الصلاة والاسم أو التصنيف الذي تختاره، وإعدادات الظهور والمدة اللازمة للمراجعة الرعوية.',
        },
        {
          title: 'جلسة مجتمع الصلاة',
          body:
            'يستخدم مجتمع الصلاة جلسة مجهولة مرتبطة بجهازك حتى تتمكن من إدارة طلباتك. لا يطلب التطبيق اسمك الحقيقي أو بريدك الإلكتروني لإنشاء الجلسة. تخضع الطلبات العامة للمراجعة قبل ظهورها، ويمكنك حذف طلباتك وفق الخيارات المتاحة داخل التطبيق.',
        },
        {
          title: 'الموقع والصلاحيات',
          body:
            'تحتاج بوصلة الشرق إلى صلاحية الموقع أو مستشعر الاتجاه في الجهاز لعرض الاتجاه أثناء الاستخدام. لا يحفظ التطبيق موقعك الجغرافي لأغراض البوصلة. قد يطلب التطبيق صلاحية الإشعارات فقط عندما تكون هناك ميزة تحتاج إلى تذكير أو تنبيه.',
        },
        {
          title: 'مصادر ومزودو المحتوى',
          body:
            'يجلب التطبيق بعض المحتوى الكنسي من مصادر خارجية، مثل بطاقة السنكسار والأخبار والبث المباشر. عند اختيار الإنجليزية أو اليونانية، قد تُرسل النصوص الديناميكية اللازمة للترجمة إلى مزود الترجمة من خلال الخادم. لا تُرسل الصورة أو روابط المصدر ضمن طلب الترجمة.',
        },
        {
          title: 'الاستخدام والمشاركة',
          body:
            'لا نبيع معلوماتك الشخصية ولا نستخدمها للإعلانات الموجّهة. نستخدم المعلومات بالقدر اللازم لتشغيل الميزات، حماية مجتمع الصلاة، مراجعة الطلبات، ومنع إساءة الاستخدام. قد تظهر الطلبات التي تختار مشاركتها مع المجتمع للآخرين بعد المراجعة.',
        },
        {
          title: 'الاحتفاظ والأمان',
          body:
            'نحتفظ ببيانات ميزات الخادم للفترة اللازمة لتقديم الخدمة أو للمراجعة والحماية من إساءة الاستخدام، وقد تنتهي الطلبات بحسب المدة التي تختارها. نستخدم إجراءات معقولة لحماية البيانات، لكن لا توجد وسيلة نقل أو تخزين آمنة بشكل مطلق.',
        },
        {
          title: 'التغييرات والتواصل',
          body:
            'قد نحدّث هذه السياسة عندما تتغير ميزات التطبيق. نموذج التواصل الظاهر في التطبيق غير مربوط بخدمة إرسال حاليًا؛ لذلك لا تُرسل البيانات المدخلة فيه ولا تُحفظ. سنحدّث السياسة قبل تفعيل الإرسال.',
        },
      ] satisfies LegalSection[],
    },
    termsPage: {
      title: 'الشروط والأحكام',
      disclaimer:
        'هذه مسودة عامة للمعلومات وليست مشورة قانونية. الجهة الناشرة المعلنة: OrthoTypikon؛ لم تُحدد الدولة أو القانون الحاكم أو بريد التواصل القانوني. راجعها مع محامٍ مؤهل واستكمل البيانات قبل الاعتماد الرسمي. نموذج التواصل داخل التطبيق غير متصل بخدمة إرسال حاليًا.',
      intro:
        'توضح هذه الشروط قواعد استخدام OrthoTypikon وميزاته. باستخدام التطبيق، فإنك توافق على هذه الشروط وعلى سياسة الخصوصية.',
      updated: 'آخر تحديث: ٢ تشرين الأول ٢٠٢٦',
      sections: [
        {
          title: 'القبول والأهلية',
          body:
            'باستخدام التطبيق، توافق على هذه الشروط. إذا لم توافق عليها، فتوقف عن استخدام التطبيق. إذا كنت دون السن الذي يسمح لك بالموافقة وفق القانون المحلي، فاستخدم التطبيق بمشاركة ولي أمرك.',
        },
        {
          title: 'الخدمات وطبيعة المعلومات',
          body:
            'قد يتضمن التطبيق تقويمًا كنسيًا وقراءات وصلوات وتذكيرات وبوصلة شرقية ودليل أماكن ومحتوى من مصادر خارجية. يقدم التطبيق أدوات ومعلومات روحية عامة، ولا يحل محل المصادر الكنسية الرسمية أو الإرشاد الرعوي. تحقق من المعلومات المهمة لدى مصدرها المختص.',
        },
        {
          title: 'الاستخدام المقبول',
          body:
            'استخدم التطبيق بطريقة قانونية ومحترمة. لا تنتحل شخصية أحد، ولا تنشر تهديدًا أو مضايقة أو محتوى غير قانوني أو رسائل مزعجة، ولا تحاول تعطيل التطبيق أو الوصول غير المصرح به إلى أنظمته. أنت مسؤول عن المحتوى الذي ترسله.',
        },
        {
          title: 'طلبات الصلاة والمحتوى المشترك',
          body:
            'اختر إعدادات الظهور بعناية، ولا تُضمّن في طلباتك معلومات شخصية أو حساسة عنك أو عن غيرك. قد تُراجع الطلبات العامة قبل عرضها، وقد يُرفض أو يُزال المحتوى المخالف. عند اختيار مشاركة طلب، تمنح التطبيق إذنًا محدودًا لمعالجته وعرضه بالقدر اللازم لتشغيل مجتمع الصلاة ومراجعته.',
        },
        {
          title: 'الموقع والتذكيرات',
          body:
            'قد تعتمد البوصلة ودليل الأماكن والتذكيرات على أذونات الجهاز والاتصال بالخدمات المتاحة. معلومات الاتجاه والمسافة إرشادية وليست للملاحة الطارئة. قد تتأخر الإشعارات أو لا تصل بسبب إعدادات الجهاز أو الشبكة.',
        },
        {
          title: 'المصادر والروابط الخارجية',
          body:
            'قد يعرض التطبيق محتوى أو روابط تقدمها جهات خارجية. لا نتحكم في استمرار هذه الخدمات أو محتواها، وقد تنطبق عليها شروط وسياسات خصوصية مستقلة. استخدم المصادر الخارجية وفق شروطها.',
        },
        {
          title: 'الملكية الفكرية',
          body:
            'اسم OrthoTypikon وتصميم التطبيق وبرمجياته مملوكة للجهة الناشرة أو مرخصة لها. تبقى المواد الخارجية لأصحابها أو مصادرها. لا يجوز نسخ التطبيق أو إعادة نشره أو استخدام علاماته بما يتجاوز ما يسمح به القانون أو إذن صاحب الحق.',
        },
        {
          title: 'التوافر والتغييرات',
          body:
            'قد تتغير الميزات أو تتوقف مؤقتًا أو نهائيًا، وقد يتأثر تشغيلها بالشبكة أو الجهاز أو مزودي المحتوى. نسعى إلى تقديم الخدمة بصورة نافعة، لكننا لا نضمن توافرها دون انقطاع أو خلوها من الأخطاء. قد نحدّث هذه الشروط عند تغير التطبيق.',
        },
        {
          title: 'المسؤولية والقانون والتواصل',
          body:
            'إلى الحد الذي يسمح به القانون، لا يكون OrthoTypikon مسؤولًا عن الأضرار غير المباشرة الناجمة عن تعذر استخدام التطبيق أو الاعتماد على محتوى غير رسمي؛ ولا تحد هذه الشروط من الحقوق أو المسؤوليات التي لا يسمح القانون باستبعادها. لم تُحدد بعد الدولة أو المحكمة المختصة أو وسيلة التواصل القانونية. يجب استكمالها ومراجعة هذه المسودة محليًا قبل اعتمادها. نموذج التواصل داخل التطبيق لا يرسل البيانات أو يحفظها حاليًا.',
        },
      ] satisfies LegalSection[],
    },
  },
  en: {
    sectionTitle: 'App information',
    privacy: 'Privacy policy',
    terms: 'Terms and conditions',
    about: 'About us',
    contactTitle: 'Contact us',
    socialTitle: 'Our channels',
    socialPending: 'Links will be added soon',
    socialOpenFailed: 'Could not open this social link. Please try again.',
    contactForm: {
      intro: 'This form is not connected to a sending service yet. You can fill it in, but your information will not be sent or saved.',
      name: 'Name',
      email: 'Email address',
      country: 'Country',
      chooseCountry: 'Choose a country',
      searchCountry: 'Search countries',
      noCountriesFound: 'No countries found.',
      closeCountryPicker: 'Close country list',
      phone: 'Phone number',
      optional: '(optional)',
      dialCode: 'Calling code',
      chooseDialCode: 'Choose country code (optional)',
      searchDialCode: 'Search country or calling code',
      customDialCode: 'Use code',
      clearDialCode: 'No country code',
      closeDialCodePicker: 'Close country code picker',
      message: 'What would you like to tell us?',
      submit: 'Submit',
      submitNotice: 'The form is not connected yet; your information was not sent or saved. Sending will be enabled later.',
      required: 'This field is required.',
      invalidEmail: 'Enter a valid email address.',
      invalidPhone: 'Enter a valid phone number.',
    },
    socials: {
      facebook: 'Facebook',
      instagram: 'Instagram',
    },
    privacyPage: {
      title: 'Privacy policy',
      intro:
        'We respect your privacy and aim to make OrthoTypikon a safe, quiet spiritual space. This policy explains what the app may process and how it is used.',
      updated: 'Last updated: October 2, 2026',
      sections: [
        {
          title: 'Information the app may process',
          body:
            'Most of the app can be used without creating an account. The app may process local preferences such as language, calendar type, and appearance. If you use the prayer community, it may process the prayer request, name or category you choose, visibility settings, and duration needed for pastoral review.',
        },
        {
          title: 'Prayer community session',
          body:
            'The prayer community uses an anonymous device session so you can manage your requests. The app does not require your real name or email address to create the session. Public requests are reviewed before appearing to others, and you can delete your requests through the available controls.',
        },
        {
          title: 'Location and permissions',
          body:
            'The East Compass may use location permission or the device direction sensor to show direction while it is in use. The app does not save your geographic location for the compass. Notification permission may be requested only when a feature needs a reminder or alert.',
        },
        {
          title: 'Content sources and providers',
          body:
            'The app retrieves some church content from external sources, including the Synaxarion card, news, and live streams. When English or Greek is selected, the dynamic text needed for translation may be sent to a translation provider through the server. Images and source links are not sent as translation content.',
        },
        {
          title: 'Use and sharing',
          body:
            'We do not sell personal information or use it for targeted advertising. Information is used only as needed to operate features, protect the prayer community, review requests, and prevent abuse. Requests you choose to share with the community may be visible to others after review.',
        },
        {
          title: 'Retention and security',
          body:
            'Server feature data is retained for as long as needed to provide the service, review requests, and prevent abuse. Requests may expire according to the duration you select. We use reasonable safeguards to protect data, but no transmission or storage method is completely secure.',
        },
        {
          title: 'Changes and contact',
          body:
            'We may update this policy when app features change. The last-updated date appears at the top of this page. The contact form is not connected to a sending service yet, so information entered there is not sent or saved. We will update this policy before sending is enabled.',
        },
      ] satisfies LegalSection[],
    },
    termsPage: {
      title: 'Terms and conditions',
      disclaimer:
        'This is a general informational draft, not legal advice. The stated publisher name is OrthoTypikon; no country, governing law, or legal contact email has been provided. Have a qualified lawyer review and complete it before formal adoption. The in-app contact form is not connected to a sending service.',
      intro:
        'These terms describe the rules for using OrthoTypikon and its features. By using the app, you agree to these terms and the Privacy Policy.',
      updated: 'Last updated: October 2, 2026',
      sections: [
        {
          title: 'Acceptance and eligibility',
          body:
            'By using the app, you agree to these terms. If you do not agree, stop using it. If you are below the age at which you may agree under local law, use the app with a parent or guardian.',
        },
        {
          title: 'Services and nature of information',
          body:
            'The app may include a church calendar, readings, prayers, reminders, an East Compass, a place directory, and content from external sources. It provides general spiritual tools and information; it does not replace official church sources or pastoral guidance. Verify important information with the relevant source.',
        },
        {
          title: 'Acceptable use',
          body:
            'Use the app lawfully and respectfully. Do not impersonate anyone, post threats, harassment, unlawful content, or spam, or attempt to disrupt the app or gain unauthorized access to its systems. You are responsible for the content you submit.',
        },
        {
          title: 'Prayer requests and shared content',
          body:
            'Choose visibility settings carefully, and do not include personal or sensitive information about yourself or others. Public requests may be reviewed before display, and violating content may be rejected or removed. When you choose to share a request, you grant the app limited permission to process and display it as needed to operate and moderate the prayer community.',
        },
        {
          title: 'Location and reminders',
          body:
            'The compass, place directory, and reminders may depend on device permissions and available network services. Direction and distance information is for guidance, not emergency navigation. Notifications may be delayed or unavailable because of device settings or network conditions.',
        },
        {
          title: 'External sources and links',
          body:
            'The app may show content or links provided by third parties. We do not control whether those services remain available or what they publish, and separate terms and privacy policies may apply. Use third-party services according to their terms.',
        },
        {
          title: 'Intellectual property',
          body:
            'The OrthoTypikon name, app design, and software are owned or licensed by the publisher. External materials remain with their respective owners or sources. You may not copy or redistribute the app or use its marks beyond what the law or the rights holder permits.',
        },
        {
          title: 'Availability and changes',
          body:
            'Features may change or be temporarily or permanently discontinued, and their operation may depend on your device, network, or content providers. We aim to provide a useful service but do not guarantee uninterrupted or error-free availability. We may update these terms when the app changes.',
        },
        {
          title: 'Liability, governing law, and contact',
          body:
            'To the extent permitted by law, OrthoTypikon is not liable for indirect harm arising from inability to use the app or reliance on unofficial content. These terms do not limit rights or liabilities that applicable law does not allow to be excluded. The country, competent courts, and legal contact method have not yet been specified and must be completed and locally reviewed before these terms are formally adopted. The in-app contact form does not currently send or save submissions.',
        },
      ] satisfies LegalSection[],
    },
  },
  el: {
    sectionTitle: 'Πληροφορίες εφαρμογής',
    privacy: 'Πολιτική απορρήτου',
    terms: 'Όροι και προϋποθέσεις',
    about: 'Σχετικά με εμάς',
    contactTitle: 'Επικοινωνήστε μαζί μας',
    socialTitle: 'Τα κανάλια μας',
    socialPending: 'Οι σύνδεσμοι θα προστεθούν σύντομα',
    socialOpenFailed: 'Δεν ήταν δυνατό να ανοίξει αυτός ο σύνδεσμος. Δοκιμάστε ξανά.',
    contactForm: {
      intro: 'Η φόρμα δεν είναι ακόμη συνδεδεμένη με υπηρεσία αποστολής. Μπορείτε να τη συμπληρώσετε, αλλά οι πληροφορίες σας δεν θα σταλούν ούτε θα αποθηκευτούν.',
      name: 'Όνομα',
      email: 'Διεύθυνση email',
      country: 'Χώρα',
      chooseCountry: 'Επιλέξτε χώρα',
      searchCountry: 'Αναζήτηση χωρών',
      noCountriesFound: 'Δεν βρέθηκαν χώρες.',
      closeCountryPicker: 'Κλείσιμο λίστας χωρών',
      phone: 'Τηλέφωνο',
      optional: '(προαιρετικό)',
      dialCode: 'Κωδικός κλήσης',
      chooseDialCode: 'Επιλογή κωδικού χώρας (προαιρετικά)',
      searchDialCode: 'Αναζήτηση χώρας ή κωδικού',
      customDialCode: 'Χρήση κωδικού',
      clearDialCode: 'Χωρίς κωδικό χώρας',
      closeDialCodePicker: 'Κλείσιμο επιλογής κωδικού χώρας',
      message: 'Τι θέλετε να μας πείτε;',
      submit: 'Υποβολή',
      submitNotice: 'Η φόρμα δεν είναι ακόμη συνδεδεμένη· οι πληροφορίες σας δεν στάλθηκαν ούτε αποθηκεύτηκαν. Η αποστολή θα ενεργοποιηθεί αργότερα.',
      required: 'Αυτό το πεδίο είναι υποχρεωτικό.',
      invalidEmail: 'Εισαγάγετε μια έγκυρη διεύθυνση email.',
      invalidPhone: 'Εισαγάγετε έναν έγκυρο αριθμό τηλεφώνου.',
    },
    socials: {
      facebook: 'Facebook',
      instagram: 'Instagram',
    },
    privacyPage: {
      title: 'Πολιτική απορρήτου',
      intro:
        'Σεβόμαστε την ιδιωτικότητά σας και θέλουμε το OrthoTypikon να είναι ένας ασφαλής και ήσυχος πνευματικός χώρος. Η πολιτική αυτή εξηγεί ποια δεδομένα μπορεί να επεξεργάζεται η εφαρμογή και για ποιον σκοπό.',
      updated: 'Τελευταία ενημέρωση: 2 Οκτωβρίου 2026',
      sections: [
        {
          title: 'Πληροφορίες που μπορεί να επεξεργάζεται η εφαρμογή',
          body:
            'Τα περισσότερα μέρη της εφαρμογής λειτουργούν χωρίς δημιουργία λογαριασμού. Η εφαρμογή μπορεί να επεξεργάζεται τοπικές προτιμήσεις, όπως γλώσσα, τύπο ημερολογίου και εμφάνιση. Αν χρησιμοποιείτε την κοινότητα προσευχής, μπορεί να επεξεργάζεται το αίτημα, το όνομα ή την κατηγορία που επιλέγετε, τις ρυθμίσεις ορατότητας και τη διάρκεια που χρειάζεται για ποιμαντικό έλεγχο.',
        },
        {
          title: 'Συνεδρία κοινότητας προσευχής',
          body:
            'Η κοινότητα προσευχής χρησιμοποιεί ανώνυμη συνεδρία συσκευής ώστε να διαχειρίζεστε τα αιτήματά σας. Δεν απαιτείται πραγματικό όνομα ή email για τη δημιουργία της συνεδρίας. Τα δημόσια αιτήματα ελέγχονται πριν εμφανιστούν και μπορείτε να τα διαγράψετε από τις διαθέσιμες επιλογές.',
        },
        {
          title: 'Τοποθεσία και άδειες',
          body:
            'Η Πυξίδα Ανατολής μπορεί να χρησιμοποιεί άδεια τοποθεσίας ή τον αισθητήρα κατεύθυνσης της συσκευής όσο τη χρησιμοποιείτε. Η εφαρμογή δεν αποθηκεύει τη γεωγραφική σας θέση για την πυξίδα. Η άδεια ειδοποιήσεων μπορεί να ζητηθεί μόνο όταν μια λειτουργία χρειάζεται υπενθύμιση ή ειδοποίηση.',
        },
        {
          title: 'Πηγές περιεχομένου και πάροχοι',
          body:
            'Η εφαρμογή λαμβάνει εκκλησιαστικό περιεχόμενο από εξωτερικές πηγές, όπως το Συναξάρι, οι ειδήσεις και οι ζωντανές μεταδόσεις. Όταν επιλέγετε αγγλικά ή ελληνικά, το δυναμικό κείμενο που χρειάζεται μετάφραση μπορεί να αποστέλλεται σε πάροχο μετάφρασης μέσω του διακομιστή. Οι εικόνες και οι σύνδεσμοι πηγών δεν αποστέλλονται ως περιεχόμενο μετάφρασης.',
        },
        {
          title: 'Χρήση και κοινοποίηση',
          body:
            'Δεν πουλάμε προσωπικές πληροφορίες ούτε τις χρησιμοποιούμε για στοχευμένη διαφήμιση. Οι πληροφορίες χρησιμοποιούνται μόνο όσο χρειάζεται για τη λειτουργία, την προστασία της κοινότητας, τον έλεγχο αιτημάτων και την αποτροπή κατάχρησης. Τα αιτήματα που επιλέγετε να μοιραστείτε μπορεί να εμφανίζονται σε άλλους μετά τον έλεγχο.',
        },
        {
          title: 'Διατήρηση και ασφάλεια',
          body:
            'Τα δεδομένα των λειτουργιών του διακομιστή διατηρούνται όσο χρειάζεται για την παροχή της υπηρεσίας, τον έλεγχο και την αποτροπή κατάχρησης. Τα αιτήματα μπορεί να λήγουν σύμφωνα με τη διάρκεια που επιλέγετε. Χρησιμοποιούμε εύλογες δικλίδες ασφαλείας, όμως καμία μέθοδος μετάδοσης ή αποθήκευσης δεν είναι απολύτως ασφαλής.',
        },
        {
          title: 'Αλλαγές και επικοινωνία',
          body:
            'Μπορεί να ενημερώνουμε αυτή την πολιτική όταν αλλάζουν οι λειτουργίες της εφαρμογής. Η ημερομηνία τελευταίας ενημέρωσης εμφανίζεται στην κορυφή της σελίδας. Η φόρμα επικοινωνίας δεν είναι ακόμη συνδεδεμένη με υπηρεσία αποστολής, επομένως οι πληροφορίες που εισάγονται δεν αποστέλλονται ούτε αποθηκεύονται. Η πολιτική θα ενημερωθεί πριν ενεργοποιηθεί η αποστολή.',
        },
      ] satisfies LegalSection[],
    },
    termsPage: {
      title: 'Όροι και προϋποθέσεις',
      disclaimer:
        'Αυτό είναι ένα γενικό ενημερωτικό προσχέδιο και δεν αποτελεί νομική συμβουλή. Η δηλωμένη επωνυμία του εκδότη είναι OrthoTypikon· δεν έχουν δοθεί χώρα, εφαρμοστέο δίκαιο ή νομικό email επικοινωνίας. Ζητήστε έλεγχο από εξειδικευμένο δικηγόρο και συμπληρώστε τα στοιχεία πριν από την επίσημη υιοθέτηση. Η φόρμα επικοινωνίας της εφαρμογής δεν συνδέεται με υπηρεσία αποστολής.',
      intro:
        'Οι όροι αυτοί περιγράφουν τους κανόνες χρήσης του OrthoTypikon και των λειτουργιών του. Με τη χρήση της εφαρμογής αποδέχεστε τους όρους και την Πολιτική απορρήτου.',
      updated: 'Τελευταία ενημέρωση: 2 Οκτωβρίου 2026',
      sections: [
        {
          title: 'Αποδοχή και επιλεξιμότητα',
          body:
            'Με τη χρήση της εφαρμογής αποδέχεστε τους όρους. Αν δεν συμφωνείτε, σταματήστε να τη χρησιμοποιείτε. Αν δεν έχετε συμπληρώσει την ηλικία κατά την οποία μπορείτε να συναινέσετε σύμφωνα με την τοπική νομοθεσία, χρησιμοποιήστε την εφαρμογή με γονέα ή κηδεμόνα.',
        },
        {
          title: 'Υπηρεσίες και χαρακτήρας των πληροφοριών',
          body:
            'Η εφαρμογή μπορεί να περιλαμβάνει εκκλησιαστικό ημερολόγιο, αναγνώσματα, προσευχές, υπενθυμίσεις, Πυξίδα Ανατολής, κατάλογο τοποθεσιών και περιεχόμενο από εξωτερικές πηγές. Παρέχει γενικά πνευματικά εργαλεία και πληροφορίες· δεν αντικαθιστά επίσημες εκκλησιαστικές πηγές ή ποιμαντική καθοδήγηση. Επαληθεύετε τις σημαντικές πληροφορίες στην αρμόδια πηγή.',
        },
        {
          title: 'Αποδεκτή χρήση',
          body:
            'Χρησιμοποιείτε την εφαρμογή νόμιμα και με σεβασμό. Μην υποδύεστε άλλο πρόσωπο, μην δημοσιεύετε απειλές, παρενόχληση, παράνομο περιεχόμενο ή ανεπιθύμητα μηνύματα και μην επιχειρείτε να διακόψετε τη λειτουργία της εφαρμογής ή να αποκτήσετε μη εξουσιοδοτημένη πρόσβαση στα συστήματά της. Είστε υπεύθυνοι για το περιεχόμενο που υποβάλλετε.',
        },
        {
          title: 'Αιτήματα προσευχής και κοινοποιημένο περιεχόμενο',
          body:
            'Επιλέγετε προσεκτικά τις ρυθμίσεις ορατότητας και μην συμπεριλαμβάνετε προσωπικές ή ευαίσθητες πληροφορίες για εσάς ή άλλους. Τα δημόσια αιτήματα μπορεί να ελέγχονται πριν εμφανιστούν και το περιεχόμενο που παραβιάζει τους όρους μπορεί να απορριφθεί ή να αφαιρεθεί. Όταν επιλέγετε να κοινοποιήσετε ένα αίτημα, παρέχετε στην εφαρμογή περιορισμένη άδεια επεξεργασίας και προβολής του, όσο χρειάζεται για τη λειτουργία και τον έλεγχο της κοινότητας προσευχής.',
        },
        {
          title: 'Τοποθεσία και υπενθυμίσεις',
          body:
            'Η πυξίδα, ο κατάλογος τοποθεσιών και οι υπενθυμίσεις μπορεί να εξαρτώνται από τις άδειες της συσκευής και τις διαθέσιμες υπηρεσίες δικτύου. Οι πληροφορίες κατεύθυνσης και απόστασης είναι ενδεικτικές και δεν προορίζονται για πλοήγηση έκτακτης ανάγκης. Οι ειδοποιήσεις μπορεί να καθυστερήσουν ή να μη φτάσουν λόγω ρυθμίσεων της συσκευής ή του δικτύου.',
        },
        {
          title: 'Εξωτερικές πηγές και σύνδεσμοι',
          body:
            'Η εφαρμογή μπορεί να εμφανίζει περιεχόμενο ή συνδέσμους τρίτων. Δεν ελέγχουμε τη διαθεσιμότητα αυτών των υπηρεσιών ή το περιεχόμενό τους και μπορεί να ισχύουν ξεχωριστοί όροι και πολιτικές απορρήτου. Χρησιμοποιείτε τις υπηρεσίες τρίτων σύμφωνα με τους όρους τους.',
        },
        {
          title: 'Πνευματική ιδιοκτησία',
          body:
            'Το όνομα OrthoTypikon, ο σχεδιασμός και το λογισμικό της εφαρμογής ανήκουν στον εκδότη ή χρησιμοποιούνται με άδεια. Το εξωτερικό υλικό παραμένει στους αντίστοιχους δικαιούχους ή στις πηγές του. Δεν επιτρέπεται η αντιγραφή ή αναδιανομή της εφαρμογής ή η χρήση των σημάτων της πέρα από όσα επιτρέπει ο νόμος ή ο δικαιούχος.',
        },
        {
          title: 'Διαθεσιμότητα και αλλαγές',
          body:
            'Οι λειτουργίες μπορεί να αλλάξουν ή να διακοπούν προσωρινά ή μόνιμα και η λειτουργία τους μπορεί να εξαρτάται από τη συσκευή, το δίκτυο ή τους παρόχους περιεχομένου. Στόχος μας είναι μια χρήσιμη υπηρεσία, χωρίς εγγύηση αδιάλειπτης ή χωρίς σφάλματα λειτουργίας. Μπορεί να ενημερώνουμε τους όρους όταν αλλάζει η εφαρμογή.',
        },
        {
          title: 'Ευθύνη, εφαρμοστέο δίκαιο και επικοινωνία',
          body:
            'Στον βαθμό που το επιτρέπει ο νόμος, το OrthoTypikon δεν ευθύνεται για έμμεση ζημία που προκύπτει από αδυναμία χρήσης της εφαρμογής ή από την εμπιστοσύνη σε μη επίσημο περιεχόμενο. Οι όροι αυτοί δεν περιορίζουν δικαιώματα ή ευθύνες που δεν επιτρέπεται να αποκλειστούν από την εφαρμοστέα νομοθεσία. Η χώρα, τα αρμόδια δικαστήρια και ο νομικός τρόπος επικοινωνίας δεν έχουν ακόμη οριστεί και πρέπει να συμπληρωθούν και να ελεγχθούν τοπικά πριν από την επίσημη υιοθέτηση. Η φόρμα επικοινωνίας της εφαρμογής δεν αποστέλλει ούτε αποθηκεύει υποβολές.',
        },
      ] satisfies LegalSection[],
    },
  },
} as const;

export function getMoreContent(language: Language) {
  return moreContent[language];
}