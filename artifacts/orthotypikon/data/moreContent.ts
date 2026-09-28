import type { Language } from '@/hooks/usePreferences';

export type MoreSection = 'privacy' | 'contact' | 'about' | 'donate';

type PrivacySection = {
  title: string;
  body: string;
};

export const moreContent = {
  ar: {
    sectionTitle: 'معلومات التطبيق',
    privacy: 'سياسة الخصوصية',
    contact: 'تواصل معنا',
    about: 'من نحن',
    donate: 'تبرع',
    followUs: 'تابعنا على',
    socialPending: 'سيتم إضافة الروابط قريبًا',
    socials: {
      facebook: 'فيس بوك',
      instagram: 'إنستجرام',
      whatsapp: 'واتساب',
      telegram: 'تيليغرام',
    },
    privacyPage: {
      title: 'سياسة الخصوصية',
      intro:
        'نحترم خصوصيتك ونسعى إلى أن يكون OrthoTypikon مساحة روحية آمنة وهادئة. توضّح هذه السياسة ما قد يعالجه التطبيق وكيف نستخدمه.',
      updated: 'آخر تحديث: ٢٣ أيلول ٢٠٢٦',
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
            'قد نحدّث هذه السياسة عندما تتغير ميزات التطبيق. سنعرض تاريخ آخر تحديث في أعلى الصفحة. سيتم إضافة قنوات التواصل الرسمية داخل التطبيق عند توفرها.',
        },
      ] satisfies PrivacySection[],
    },
  },
  en: {
    sectionTitle: 'App information',
    privacy: 'Privacy policy',
    contact: 'Contact us',
    about: 'About us',
    donate: 'Donate',
    followUs: 'Follow us',
    socialPending: 'Links will be added soon',
    socials: {
      facebook: 'Facebook',
      instagram: 'Instagram',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
    },
    privacyPage: {
      title: 'Privacy policy',
      intro:
        'We respect your privacy and aim to make OrthoTypikon a safe, quiet spiritual space. This policy explains what the app may process and how it is used.',
      updated: 'Last updated: September 23, 2026',
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
            'We may update this policy when app features change. The last-updated date appears at the top of this page. Official contact channels will be added in the app when they become available.',
        },
      ] satisfies PrivacySection[],
    },
  },
  el: {
    sectionTitle: 'Πληροφορίες εφαρμογής',
    privacy: 'Πολιτική απορρήτου',
    contact: 'Επικοινωνήστε μαζί μας',
    about: 'Σχετικά με εμάς',
    donate: 'Δωρεά',
    followUs: 'Ακολουθήστε μας',
    socialPending: 'Οι σύνδεσμοι θα προστεθούν σύντομα',
    socials: {
      facebook: 'Facebook',
      instagram: 'Instagram',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
    },
    privacyPage: {
      title: 'Πολιτική απορρήτου',
      intro:
        'Σεβόμαστε την ιδιωτικότητά σας και θέλουμε το OrthoTypikon να είναι ένας ασφαλής και ήσυχος πνευματικός χώρος. Η πολιτική αυτή εξηγεί ποια δεδομένα μπορεί να επεξεργάζεται η εφαρμογή και για ποιον σκοπό.',
      updated: 'Τελευταία ενημέρωση: 23 Σεπτεμβρίου 2026',
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
            'Μπορεί να ενημερώνουμε αυτή την πολιτική όταν αλλάζουν οι λειτουργίες της εφαρμογής. Η ημερομηνία τελευταίας ενημέρωσης εμφανίζεται στην κορυφή της σελίδας. Τα επίσημα κανάλια επικοινωνίας θα προστεθούν στην εφαρμογή όταν είναι διαθέσιμα.',
        },
      ] satisfies PrivacySection[],
    },
  },
} as const;

export function getMoreContent(language: Language) {
  return moreContent[language];
}