type Language = 'ar' | 'en' | 'el';

export const PRAYER_COLLECTION_IDS = [
  'gospels',
  'daily',
  'various',
  'supplications',
  'epistles',
] as const;

export type PrayerCollectionId = (typeof PRAYER_COLLECTION_IDS)[number];

export type PrayerCollectionEntry = {
  id: string;
  title: string;
  reference: string;
  text: string;
};

export type PrayerCollection = {
  description: string;
  entries: PrayerCollectionEntry[];
};

export const prayerCollections: Record<
  Language,
  Record<PrayerCollectionId, PrayerCollection>
> = {
  ar: {
    daily: {
      description: 'صلوات قصيرة ترافق بداية يومك وختامه وكل ساعة فيه.',
      entries: [
        {
          id: 'lords-prayer',
          title: 'الصلاة الربّية',
          reference: 'متى ٦: ٩–١٣',
          text: 'أبانا الذي في السماوات، ليتقدّس اسمك. ليأتِ ملكوتك. لتكن مشيئتك كما في السماء كذلك على الأرض. خبزنا الجوهري أعطنا اليوم. واترك لنا ما علينا كما نترك نحن لمن لنا عليه. ولا تدخلنا في تجربة، لكن نجّنا من الشرير.',
        },
        {
          id: 'jesus-prayer',
          title: 'صلاة يسوع',
          reference: 'صلاة متواترة',
          text: 'يا ربّي يسوع المسيح، ابن الله، ارحمني أنا الخاطئ.',
        },
        {
          id: 'trisagion',
          title: 'التسبحة الملائكية',
          reference: 'صلاة تمهيدية',
          text: 'قدوس الله، قدوس القوي، قدوس الذي لا يموت، ارحمنا. المجد للآب والابن والروح القدس، الآن وكل أوان وإلى دهر الداهرين. آمين.',
        },
      ],
    },
    various: {
      description: 'صلوات للتأمل والشكر في أوقات ومناسبات مختلفة.',
      entries: [
        {
          id: 'morning-thanksgiving',
          title: 'صلاة الشكر في الصباح',
          reference: 'صلاة يومية',
          text: 'أيها الرب الإله، أشكرك لأنك أيقظتني إلى هذا اليوم. بارك أعمالي وأقوالي، وامنحني أن أسير في سلام ومحبة، لمجد اسمك القدوس.',
        },
        {
          id: 'before-communion',
          title: 'صلاة قبل المناولة',
          reference: 'استعداد للتناول المقدس',
          text: 'أيها السيد الرب يسوع المسيح، يا إلهنا، اجعلني مستحقًا أن أتناول من أسرارك المقدسة لمغفرة خطاياي وحياة أبدية.',
        },
      ],
    },
    supplications: {
      description: 'طلبات وصلوات من أجل المرضى والراقدين وكل محتاج.',
      entries: [
        {
          id: 'for-the-sick',
          title: 'من أجل المرضى',
          reference: 'طلبة من أجل الشفاء',
          text: 'أيها الرب يسوع المسيح، يا طبيب النفوس والأجساد، افتقد برحمتك كل مريض. امنحه صبرًا وعزاءً وشفاءً، وكن سندًا لعائلته وكل من يخدمه.',
        },
        {
          id: 'for-the-departed',
          title: 'من أجل الراقدين',
          reference: 'طلبة من أجل المنتقلين',
          text: 'يا رب، اذكر عبيدك الراقدين على رجاء القيامة والحياة الأبدية، وأسكنهم حيث يشرق نور وجهك، وامنح ذويهم تعزية ورجاء.',
        },
      ],
    },
    gospels: {
      description: 'مختارات قصيرة من البشائر الأربع المقدسة.',
      entries: [
        {
          id: 'gospel-matthew',
          title: 'إنجيل متّى',
          reference: 'متى ٥: ٣–٤',
          text: 'طوبى للمساكين بالروح، لأن لهم ملكوت السماوات. طوبى للحزانى، لأنهم يتعزّون.',
        },
        {
          id: 'gospel-mark',
          title: 'إنجيل مرقس',
          reference: 'مرقس ١٠: ٤٥',
          text: 'لأن ابن الإنسان أيضًا لم يأتِ ليُخدَم بل ليَخدِم، وليبذل نفسه فدية عن كثيرين.',
        },
        {
          id: 'gospel-luke',
          title: 'إنجيل لوقا',
          reference: 'لوقا ٢: ١٠–١١',
          text: 'لا تخافوا، فها أنا أبشّركم بفرح عظيم يكون لجميع الشعب: أنه وُلد لكم اليوم مخلّص، هو المسيح الرب.',
        },
        {
          id: 'gospel-john',
          title: 'إنجيل يوحنّا',
          reference: 'يوحنّا ١٤: ٢٧',
          text: 'سلامًا أترك لكم، سلامي أعطيكم. ليس كما يعطي العالم أعطيكم أنا. لا تضطرب قلوبكم ولا تجزع.',
        },
      ],
    },
    epistles: {
      description: 'آيات للتأمل من رسائل الرسل القديسين.',
      entries: [
        {
          id: 'epistle-romans',
          title: 'رسالة رومية',
          reference: 'رومية ٨: ٣٨–٣٩',
          text: 'فإني متيقّن أنه لا موت ولا حياة، ولا ملائكة ولا رؤساء، ولا قوات ولا أمور حاضرة ولا مستقبلة، ولا علو ولا عمق، ولا خليقة أخرى تقدر أن تفصلنا عن محبة الله التي في المسيح يسوع ربنا.',
        },
        {
          id: 'epistle-corinthians',
          title: 'الرسالة الأولى إلى أهل كورنثوس',
          reference: '١ كورنثوس ١٣: ٤',
          text: 'المحبة تتأنّى وترفق. المحبة لا تحسد، ولا تتفاخر، ولا تنتفخ.',
        },
        {
          id: 'epistle-philippians',
          title: 'رسالة فيلبّي',
          reference: 'فيلبّي ٤: ٦–٧',
          text: 'لا تهتمّوا بشيء، بل في كل شيء بالصلاة والدعاء مع الشكر، لتُعلَم طلباتكم لدى الله. وسلام الله الذي يفوق كل عقل يحفظ قلوبكم وأفكاركم في المسيح يسوع.',
        },
        {
          id: 'epistle-ephesians',
          title: 'رسالة أفسس',
          reference: 'أفسس ٢: ٨–٩',
          text: 'بالنعمة أنتم مخلَّصون، بالإيمان، وذلك ليس منكم. هو عطية الله، وليس من أعمال كيلا يفتخر أحد.',
        },
      ],
    },
  },
  en: {
    daily: {
      description: 'Short prayers for the beginning and close of each day.',
      entries: [
        {
          id: 'lords-prayer',
          title: 'The Lord’s Prayer',
          reference: 'Matthew 6:9–13',
          text: 'Our Father in heaven, hallowed be Your name. Your kingdom come. Your will be done on earth as it is in heaven. Give us this day our daily bread. And forgive us our debts, as we forgive our debtors. And do not lead us into temptation, but deliver us from the evil one.',
        },
        {
          id: 'jesus-prayer',
          title: 'The Jesus Prayer',
          reference: 'A prayer for repeated use',
          text: 'Lord Jesus Christ, Son of God, have mercy on me, a sinner.',
        },
        {
          id: 'trisagion',
          title: 'The Trisagion Prayer',
          reference: 'Opening prayer',
          text: 'Holy God, Holy Mighty, Holy Immortal, have mercy on us. Glory to the Father, and to the Son, and to the Holy Spirit, now and ever and unto ages of ages. Amen.',
        },
      ],
    },
    various: {
      description: 'Prayers for reflection and thanksgiving at different times.',
      entries: [
        {
          id: 'morning-thanksgiving',
          title: 'Morning Thanksgiving',
          reference: 'A daily prayer',
          text: 'Lord God, I thank You for raising me to this day. Bless my work and my words, and grant that I may walk in peace and love, to the glory of Your holy name.',
        },
        {
          id: 'before-communion',
          title: 'Before Holy Communion',
          reference: 'Preparation for Communion',
          text: 'Lord Jesus Christ our God, make me worthy to receive Your holy mysteries for the forgiveness of my sins and for life everlasting.',
        },
      ],
    },
    supplications: {
      description: 'Prayers for the sick, the departed, and all who are in need.',
      entries: [
        {
          id: 'for-the-sick',
          title: 'For the Sick',
          reference: 'A prayer for healing',
          text: 'Lord Jesus Christ, Physician of souls and bodies, visit all who are ill in Your mercy. Grant them patience, comfort, and healing, and strengthen their families and caregivers.',
        },
        {
          id: 'for-the-departed',
          title: 'For the Departed',
          reference: 'A prayer for those who have fallen asleep',
          text: 'Lord, remember Your servants who have fallen asleep in the hope of the resurrection and life everlasting. Give them rest where the light of Your face shines, and comfort and hope to those who mourn.',
        },
      ],
    },
    gospels: {
      description: 'Short readings from the four holy Gospels.',
      entries: [
        {
          id: 'gospel-matthew',
          title: 'The Gospel of Matthew',
          reference: 'Matthew 5:3–4',
          text: 'Blessed are the poor in spirit, for theirs is the kingdom of heaven. Blessed are those who mourn, for they shall be comforted.',
        },
        {
          id: 'gospel-mark',
          title: 'The Gospel of Mark',
          reference: 'Mark 10:45',
          text: 'For even the Son of Man did not come to be served, but to serve, and to give His life a ransom for many.',
        },
        {
          id: 'gospel-luke',
          title: 'The Gospel of Luke',
          reference: 'Luke 2:10–11',
          text: 'Do not be afraid, for behold, I bring you good tidings of great joy which will be to all people. For there is born to you this day in the city of David a Savior, who is Christ the Lord.',
        },
        {
          id: 'gospel-john',
          title: 'The Gospel of John',
          reference: 'John 14:27',
          text: 'Peace I leave with you, My peace I give to you; not as the world gives do I give to you. Let not your heart be troubled, neither let it be afraid.',
        },
      ],
    },
    epistles: {
      description: 'Passages for reflection from the letters of the holy Apostles.',
      entries: [
        {
          id: 'epistle-romans',
          title: 'The Epistle to the Romans',
          reference: 'Romans 8:38–39',
          text: 'For I am persuaded that neither death nor life, nor angels nor principalities nor powers, nor things present nor things to come, nor height nor depth, nor any other created thing, shall be able to separate us from the love of God which is in Christ Jesus our Lord.',
        },
        {
          id: 'epistle-corinthians',
          title: 'The First Epistle to the Corinthians',
          reference: '1 Corinthians 13:4',
          text: 'Love suffers long and is kind; love does not envy; love does not parade itself, is not puffed up.',
        },
        {
          id: 'epistle-philippians',
          title: 'The Epistle to the Philippians',
          reference: 'Philippians 4:6–7',
          text: 'Be anxious for nothing, but in everything by prayer and supplication, with thanksgiving, let your requests be made known to God; and the peace of God, which surpasses all understanding, will guard your hearts and minds through Christ Jesus.',
        },
        {
          id: 'epistle-ephesians',
          title: 'The Epistle to the Ephesians',
          reference: 'Ephesians 2:8–9',
          text: 'For by grace you have been saved through faith, and that not of yourselves; it is the gift of God, not of works, lest anyone should boast.',
        },
      ],
    },
  },
  el: {
    daily: {
      description: 'Σύντομες προσευχές για την αρχή και το τέλος κάθε ημέρας.',
      entries: [
        {
          id: 'lords-prayer',
          title: 'Η Κυριακή Προσευχή',
          reference: 'Ματθαίος 6:9–13',
          text: 'Πάτερ ημών ο εν τοις ουρανοίς· αγιασθήτω το όνομά σου· ελθέτω η βασιλεία σου· γενηθήτω το θέλημά σου, ως εν ουρανώ και επί της γης. Τον άρτον ημών τον επιούσιον δος ημίν σήμερον· και άφες ημίν τα οφειλήματα ημών, ως και ημείς αφίεμεν τοις οφειλέταις ημών· και μη εισενέγκης ημάς εις πειρασμόν, αλλά ρύσαι ημάς από του πονηρού.',
        },
        {
          id: 'jesus-prayer',
          title: 'Η Ευχή του Ιησού',
          reference: 'Ευχή για επανάληψη',
          text: 'Κύριε Ιησού Χριστέ, Υιέ του Θεού, ελέησόν με τον αμαρτωλό.',
        },
        {
          id: 'trisagion',
          title: 'Ο Τρισάγιος Ύμνος',
          reference: 'Εναρκτήρια προσευχή',
          text: 'Άγιος ο Θεός, Άγιος Ισχυρός, Άγιος Αθάνατος, ελέησον ημάς. Δόξα Πατρί και Υιώ και Αγίω Πνεύματι, και νυν και αεί και εις τους αιώνας των αιώνων. Αμήν.',
        },
      ],
    },
    various: {
      description: 'Προσευχές για περισυλλογή και ευχαριστία σε διάφορες στιγμές.',
      entries: [
        {
          id: 'morning-thanksgiving',
          title: 'Πρωινή Ευχαριστία',
          reference: 'Καθημερινή προσευχή',
          text: 'Κύριε ο Θεός, Σε ευχαριστώ που με ανέστησες σε αυτή την ημέρα. Ευλόγησε τα έργα και τα λόγια μου και αξίωσέ με να πορεύομαι με ειρήνη και αγάπη, προς δόξαν του αγίου ονόματός Σου.',
        },
        {
          id: 'before-communion',
          title: 'Πριν από τη Θεία Κοινωνία',
          reference: 'Προετοιμασία για τη Θεία Κοινωνία',
          text: 'Κύριε Ιησού Χριστέ ο Θεός μας, αξίωσέ με να μεταλάβω τα άγια Μυστήριά Σου για την άφεση των αμαρτιών μου και την αιώνια ζωή.',
        },
      ],
    },
    supplications: {
      description: 'Προσευχές για τους ασθενείς, τους κεκοιμημένους και κάθε άνθρωπο που έχει ανάγκη.',
      entries: [
        {
          id: 'for-the-sick',
          title: 'Για τους Ασθενείς',
          reference: 'Προσευχή για θεραπεία',
          text: 'Κύριε Ιησού Χριστέ, Ιατρέ των ψυχών και των σωμάτων, επίσκεψε με το έλεός Σου όλους τους ασθενείς. Χάρισέ τους υπομονή, παρηγοριά και θεραπεία, και ενίσχυσε τις οικογένειες και όσους τους φροντίζουν.',
        },
        {
          id: 'for-the-departed',
          title: 'Για τους Κεκοιμημένους',
          reference: 'Προσευχή για όσους έχουν κοιμηθεί',
          text: 'Κύριε, μνήσθητι των δούλων Σου που κοιμήθηκαν με την ελπίδα της αναστάσεως και της αιώνιας ζωής. Ανάπαυσέ τους εκεί όπου λάμπει το φως του προσώπου Σου και χάρισε παρηγοριά και ελπίδα στους οικείους τους.',
        },
      ],
    },
    gospels: {
      description: 'Σύντομα αναγνώσματα από τα τέσσερα άγια Ευαγγέλια.',
      entries: [
        {
          id: 'gospel-matthew',
          title: 'Το Ευαγγέλιο του Ματθαίου',
          reference: 'Ματθαίος 5:3–4',
          text: 'Μακάριοι οι πτωχοί τω πνεύματι, ότι αυτών εστιν η βασιλεία των ουρανών. Μακάριοι οι πενθούντες, ότι αυτοί παρακληθήσονται.',
        },
        {
          id: 'gospel-mark',
          title: 'Το Ευαγγέλιο του Μάρκου',
          reference: 'Μάρκος 10:45',
          text: 'Και γαρ ο Υιός του ανθρώπου ουκ ήλθε διακονηθήναι, αλλά διακονήσαι, και δούναι την ψυχήν αυτού λύτρον αντί πολλών.',
        },
        {
          id: 'gospel-luke',
          title: 'Το Ευαγγέλιο του Λουκά',
          reference: 'Λουκάς 2:10–11',
          text: 'Μη φοβείσθε· ιδού γαρ ευαγγελίζομαι υμίν χαράν μεγάλην, ήτις έσται παντί τω λαώ, ότι ετέχθη υμίν σήμερον σωτήρ, ος εστι Χριστός Κύριος.',
        },
        {
          id: 'gospel-john',
          title: 'Το Ευαγγέλιο του Ιωάννη',
          reference: 'Ιωάννης 14:27',
          text: 'Ειρήνην αφίημι υμίν, ειρήνην την εμήν δίδωμι υμίν· ου καθώς ο κόσμος δίδωσιν, εγώ δίδωμι υμίν. Μη ταρασσέσθω υμών η καρδία μηδέ δειλιάτω.',
        },
      ],
    },
    epistles: {
      description: 'Αποσπάσματα για περισυλλογή από τις επιστολές των αγίων Αποστόλων.',
      entries: [
        {
          id: 'epistle-romans',
          title: 'Η προς Ρωμαίους Επιστολή',
          reference: 'Ρωμαίους 8:38–39',
          text: 'Πέπεισμαι γαρ ότι ούτε θάνατος ούτε ζωή, ούτε άγγελοι ούτε αρχαί ούτε δυνάμεις, ούτε ενεστώτα ούτε μέλλοντα, ούτε ύψωμα ούτε βάθος, ούτε τις κτίσις ετέρα δυνήσεται ημάς χωρίσαι από της αγάπης του Θεού της εν Χριστώ Ιησού τω Κυρίω ημών.',
        },
        {
          id: 'epistle-corinthians',
          title: 'Η Πρώτη προς Κορινθίους Επιστολή',
          reference: 'Α΄ Κορινθίους 13:4',
          text: 'Η αγάπη μακροθυμεί, χρηστεύεται· η αγάπη ου ζηλοί· η αγάπη ου περπερεύεται, ου φυσιούτεται.',
        },
        {
          id: 'epistle-philippians',
          title: 'Η προς Φιλιππησίους Επιστολή',
          reference: 'Φιλιππησίους 4:6–7',
          text: 'Μηδέν μεριμνάτε, αλλ’ εν παντί τη προσευχή και τη δεήσει μετά ευχαριστίας τα αιτήματα υμών γνωριζέσθω προς τον Θεόν· και η ειρήνη του Θεού η υπερέχουσα πάντα νουν φρουρήσει τας καρδίας υμών και τα νοήματα υμών εν Χριστώ Ιησού.',
        },
        {
          id: 'epistle-ephesians',
          title: 'Η προς Εφεσίους Επιστολή',
          reference: 'Εφεσίους 2:8–9',
          text: 'Τη γαρ χάριτί εστε σεσωσμένοι δια της πίστεως· και τούτο ουκ εξ υμών, Θεού το δώρον· ουκ εξ έργων, ίνα μη τις καυχήσηται.',
        },
      ],
    },
  },
};

export function getPrayerCollection(language: Language, collectionId: string) {
  if (!PRAYER_COLLECTION_IDS.includes(collectionId as PrayerCollectionId)) return null;
  return prayerCollections[language][collectionId as PrayerCollectionId];
}
