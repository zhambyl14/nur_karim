// Generates typeset demo pages for the demo e-books and uploads them to the
// private bucket `ebook-pages/<bookId>/v1/<n>.webp` (service role).
// Idempotent: re-running overwrites v1, removes other versions and sets
// books.ebook_page_count / ebook_version = 1.
//
//   node scripts/seed-demo-ebooks.mjs            all demo e-books
//   node scripts/seed-demo-ebooks.mjs --dry=out  only render PNG previews into ./out
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";

const W = 1240;
const H = 1754;
const MARGIN_X = 140;
const TEXT_TOP = 200;
const TEXT_BOTTOM = H - 210;
const TEXT_W = W - MARGIN_X * 2;
const FONT_FILE = path.resolve("src/app/api/reader/_fonts/Lora-Regular.ttf");
const BUCKET = "ebook-pages";
const VERSION = 1;

const C = {
  paper: "#fffdf8",
  ink: "#1d2433",
  navy: "#10223f",
  wine: "#7d1a35",
  gold: "#c8a35a",
  muted: "#6b7280",
};

/* ------------------------------------------------------------------------- */
/* Content (written by the Nur Karim editors as an introduction to each book) */
/* ------------------------------------------------------------------------- */

const CONTENT = {
  "paigambar-omiri": {
    foreword: [
      "Мұхаммед пайғамбардың (оған Алланың игілігі мен сәлемі болсын) өмірі — әр мұсылман үшін таусылмас үлгі мен тағылым көзі. Оның балалық шағы, адалдығы, отбасына деген мейірімі, қиындыққа төзімі мен әділдігі ғасырлар бойы миллиондаған адамның жүрегіне жол тапты.",
      "Сафийуррахман Мубаракфуридің «Ар-Рахиқ әл-Мәхтум» еңбегі — пайғамбар сирасына арналған ең танымал кітаптардың бірі. Ол Мұсылман әлемі лигасы өткізген сира байқауында бірінші орынды жеңіп алған.",
      "Бұл демо нұсқада сіз кітаптың тақырыбымен қысқаша таныса аласыз: пайғамбарлыққа дейінгі Мекке, Пайғамбардың дүниеге келуі мен жастық шағы туралы шағын тарау.",
    ],
    chapter: "Бірінші тарау. Пайғамбарлыққа дейінгі Мекке",
    paragraphs: [
      "Арабия түбегінің батысындағы Хижаз өлкесінде, тау мен құмның ортасында Мекке қаласы орналасқан. Бұл жерде ежелден Қағба тұр. Мұсылмандардың сенімі бойынша, оны Ибраһим пайғамбар ұлы Исмаилмен бірге тұрғызған. Сондықтан Мекке ерте заманнан бері бүкіл Арабияның рухани орталығы саналды.",
      "Алайда уақыт өте келе халық Ибраһимнің таза сенімінен алыстап кетті. Қағбаның айналасына үш жүзден астам пұт қойылды. Солай болса да, меккеліктердің бойында қонақжайлық, сөзге беріктік, батылдық сияқты асыл қасиеттер сақталып қалды.",
      "Қаланы Құрайыш тайпасы басқарды. Құрайыштықтар сауда керуендерін қыста Йеменге, жазда Шамға аттандырып, қажыларға қызмет көрсетуді үлкен абырой санады. Пайғамбардың атасы Абдулмутталиб те осы тайпаның беделді ақсақалы еді: ол қажыларды сумен қамтамасыз етіп, ұмыт болған Зәмзәм құдығын қайта ашқан.",
      "Пайғамбар дүниеге келген жылы Меккеге үлкен қауіп төнді. Йемендегі әмірші Әбраһа Қағбаны қиратпақ болып, піл мінген әскермен жорыққа шықты. Құран Кәрімдегі «Філ» сүресінде баяндалғандай, Алла Тағала өз үйін қорғап, әскерді аспаннан жіберілген құстар арқылы талқандады. Арабтар бұл жылды «Піл жылы» деп атады. Тарихшылардың көпшілігі оны біздің заманымыздың 570 немесе 571 жылына сәйкестендіреді.",
      "Мұхаммед (с.ғ.с.) Піл жылы, рабиғ әл-әууәл айында, дүйсенбі күні дүниеге келді. Әкесі Абдулла ол туылмай тұрып, сапардан қайтар жолда Ясрибте, кейін Мәдина деп аталған қалада қайтыс болған еді. Анасы Әминә нәрестенің дүниеге келгені туралы хабарды атасы Абдулмутталибке жіберді. Қуанған ата немересін Қағбаға алып барып, Аллаға шүкір етті және оған Мұхаммед — «мақталған» деген есім берді.",
      "Мекке ақсүйектерінің дәстүрі бойынша нәрестелерді таза ауалы шөл даласындағы тайпаларға емізуге беретін. Бала тілі таза араб тілінде шығып, денсаулығы мықты болсын деген ниет еді. Кішкентай Мұхаммедті Бәни Сағд тайпасынан шыққан Халима есімді әйел алды. Халима кейін бұл сәби олардың үйіне береке әкелгенін, арық түйелері сүтке толып, жайылымы жайқалғанын жиі еске алатын.",
      "Мұхаммед алты жасқа толғанда анасы Әминә Ясрибтегі туыстарына барып қайтар жолда, Әбуа деген жерде қайтыс болды. Жетім баланы атасы Абдулмутталиб өз қамқорлығына алды. Екі жылдан кейін атасы да дүниеден өтіп, сегіз жасар Мұхаммедті әкесінің бауыры Әбу Талиб тәрбиесіне алды.",
      "Әбу Талиб бай адам емес еді, сондықтан жасөспірім Мұхаммед ерте еңбекке араласты: Мекке маңындағы адырларда қой бақты, кейін ағасымен бірге сауда керуеніне ілесіп, Шамға барды. Ол жастайынан шыншылдығымен, уәдеге беріктігімен танылды. Меккеліктер оны «әл-Әмин», яғни «сенімді» деп атап, аманаттарын соған тапсыратын болды.",
      "Жиырма бес жасында Мұхаммед ауқатты әрі ақылды кәсіпкер әйел Хадиша бинт Хуәйлидтің керуенін Шамға апарып, саудадан мол пайдамен оралды. Оның адалдығы мен мінезіне тәнті болған Хадиша үйленуге ұсыныс жасады. Бұл неке жиырма бес жылға созылған бақытты, берекелі отбасының бастауы болды. Хадиша Пайғамбардың ең сенімді серігі, кейін Исламды алғаш қабылдаған адам болды.",
      "Пайғамбар отыз бес жаста болғанда, Құрайыш тасқыннан зардап шеккен Қағбаны қайта тұрғызуды қолға алды. Қара тасты орнына кім қоятыны туралы дау шығып, ру басшылары қылыштарына жармаса жаздады. Ақыры олар мешітке бірінші болып кірген адамның шешіміне жүгінуге келісті. Сол кезде кіріп келген Мұхаммедті көріп, бәрі: «Міне, әл-Әмин! Біз оның шешіміне ризамыз», — деді.",
      "Ол жерге шапанын жайып, қара тасты оның ортасына қойды да, әр ру басшысына шапанның бір шетінен ұстауды өтінді. Тас қажетті биіктікке көтерілгенде, оны өз қолымен орнына қойды. Осылайша қан төгілуге шақ тұрған дау әділ әрі даналықпен шешілді. Бұл оқиға оның пайғамбарлыққа дейін-ақ халық арасында қаншалықты құрметке ие болғанын көрсетеді.",
      "Қырық жасқа таяған шағында Мұхаммед жалғыздықты жиі іздейтін болды. Ол Мекке маңындағы Нұр тауының басындағы Хира үңгіріне барып, күндер бойы ой толғап, Жаратушысына құлшылық ететін. Дәл осы үңгірде, рамазан айының бір түнінде, адамзат тарихын өзгерткен алғашқы аян түсті. Бірақ бұл — келесі тараудың тақырыбы.",
    ],
    quote: "«Расында, сендер үшін Алланың Елшісінде көркем үлгі бар»",
    quoteSource: "Ахзаб сүресі, 21-аят",
  },
  "zhurek-tazalygy": {
    foreword: [
      "Имам Әбу Хамид әл-Ғазали (1058–1111) — ислам ойшылдарының ішіндегі ең ықпалды тұлғалардың бірі. Оның «Ихя улум ад-дин» («Дін ғылымдарын тірілту») атты көлемді еңбегі тоғыз ғасыр бойы рухани тәрбиенің негізгі кітаптарының бірі болып келеді.",
      "Ғазали адамның сыртқы амалдарымен қатар ішкі әлеміне — ниетіне, ықыласына, жүрегінің күйіне ерекше мән берді. Оның пікірінше, жүрек түзелмейінше, амалдың да рухы болмайды.",
      "Бұл демо нұсқада жүрек тазалығы тақырыбына арналған шағын тарау берілген.",
    ],
    chapter: "Бірінші тарау. Жүрек — адамның өзегі",
    paragraphs: [
      "Пайғамбарымыз (с.ғ.с.) былай деген: «Біліңдер, денеде бір кесек ет бар. Ол түзу болса, бүкіл дене түзу болады, ол бұзылса, бүкіл дене бұзылады. Біліңдер, ол — жүрек». Бұл хадисті имам әл-Бұхари мен имам Муслим жеткізген. Ғұламалар оны дініміздің іргелі хадистерінің қатарына қосады.",
      "Әрине, мұнда сөз тек кеудедегі қан айдайтын мүше туралы емес. Ғазали «жүрек» деп адамның рухани болмысын, яғни ойлайтын, сезінетін, ниет ететін ішкі әлемін айтады. Көз көреді, құлақ естиді, ал не көріп, не естігенін бағамдап, қай жолға түсетінін шешетін — жүрек.",
      "Ғазали жүректі патшаға, ал дене мүшелерін оның әскеріне теңейді. Патша әділ болса, әскер де тәртіпті болады. Ал патшаның өзі нәпсінің құлына айналса, әскер де соның жолымен кетеді. Сондықтан рухани тәрбие сырттан емес, іштен — жүректі емдеуден басталады.",
      "Жүрек тазалығының бірінші шарты — ниеттің дұрыстығы. «Амалдар ниетке байланысты, әр адамға ниет еткенінің ғана сауабы бар», — делінген әйгілі хадисте. Бір амалды екі адам бірдей орындауы мүмкін: біреуі Алланың ризашылығы үшін, екіншісі жұрт мақтасын деп. Сырттай екеуі бірдей көрінгенімен, Алла алдындағы құны мүлде басқа.",
      "Ықылас — амалды тек Алла үшін істеу. Ғазали ықыласты алтынның тазалығына ұқсатады: оған аздап та басқа металл араласса, құны төмендейді. Сол сияқты жақсы істің ішіне мақтан, атақ немесе көзбояушылық араласса, оның берекесі кетеді.",
      "Ғазали жүректің бірнеше ауруын атап көрсетеді. Солардың ең қауіптілері — менмендік, көреалмаушылық, дүниеқұмарлық және ашу. Бұл аурулардың қиындығы — оларды адам өзінен оңай байқамайды. Тәкаппар адам өзін тек лайықты құрметті талап етіп жүрмін деп ойлайды, көреалмаушы адам өз ызасын әділдікке жорып жүреді.",
      "Көреалмаушылық туралы Ғазали былай дейді: көреалмаушы адам Алланың басқаға берген нығметіне наразы болады, демек, Құдайдың үкіміне қарсы шығады. Оның зияны басқаға емес, ең алдымен өзіне тиеді: ол бөтеннің қуанышынан қайғырып, өз тыныштығын өзі алады.",
      "Әр аурудың емі бар. Ғазалидің ұсынатын емі — ауруға қарсы әрекет ету. Менмендікке кішіпейілділікпен, сараңдыққа жомарттықпен, ашуға сабырмен қарсы тұру керек. Мысалы, біреуді көре алмай жүрген адам сол кісіге дұға жасап, оны жақсы сөзбен еске алуды әдетке айналдырса, жүрегі біртіндеп жұмсара бастайды.",
      "Тағы бір маңызды тәсіл — күн сайын өзіңе есеп беру. Ұйықтар алдында бүгін не істедім, кімге жақсылық жасадым, кімнің көңілін қалдырдым деп ойлану — жүректі тазартатын қарапайым әрі тиімді жаттығу. Ғазали серіктесімен есеп айырысатын саудагердің мысалын келтіреді: пайда мен залалды санамаған саудагер ерте ме, кеш пе, күйрейді.",
      "Жүректі тыныштандыратын ең үлкен күш — Алланы еске алу. Құран Кәрімде: «Біліңдер, жүректер Алланы еске алумен ғана тыныштық табады», — делінген (Рағд сүресі, 28-аят). Зікір тек тілмен айтылатын сөздер емес; ол — күнделікті әр істе Алланың бақылауында екеніңді сезіну.",
      "Жүрек тазалығы бір күнде келмейді. Ол — сабыр мен тұрақтылықты талап ететін ұзақ жол. Бірақ осы жолға шыққан адам ішкі тыныштықтың, жақындарымен татулықтың және өмірдің мағынасын терең түсінудің дәмін татады. Келесі тарауларда біз жүректің әр ауруына жеке тоқталып, оларды емдеудің нақты жолдарын қарастырамыз.",
    ],
    quote: "«Біліңдер, жүректер Алланы еске алумен ғана тыныштық табады»",
    quoteSource: "Рағд сүресі, 28-аят",
  },
  "uakyt-bereketi": {
    foreword: [
      "Біз бәріміз уақыттың тапшылығына шағынамыз: күн қысқа, ал істер көп. Алайда кейбір адамдар сол жиырма төрт сағаттың ішінде таңғаларлық көп нәрсе тындырады. Олардың құпиясы неде?",
      "Автордың жауабы — береке. Береке дегеніміз — Алла Тағала бір іске салатын игілік пен молшылық. Берекесі бар уақыт аз болса да көп іс сыйғызады, ал берекесіз уақыт қанша көп болса да, қолдан су сияқты ағып кетеді.",
      "Бұл демо нұсқада кітаптың алғашқы тарауымен таныса аласыз.",
    ],
    chapter: "Бірінші тарау. Уақыт — ең қымбат капитал",
    paragraphs: [
      "Құран Кәрімде Алла Тағала уақытқа ант етеді: «Заманға ант етейін! Расында, адам зиянда. Тек иман келтіріп, ізгі амал жасағандар, бір-біріне ақиқатты және сабырды насихаттағандар ғана бұдан тыс» (Ғаср сүресі, 1–3-аяттар). Имам Шафиғи бұл сүре туралы: «Егер адамдар осы сүрені ғана терең ойласа, оларға жеткілікті болар еді», — деген екен.",
      "Алланың бір нәрсеге ант етуі — сол нәрсенің ерекше маңыздылығының белгісі. Уақыт — адамға берілген ең қымбат капитал. Ақшаны жоғалтсаң, қайта табуға болады, денсаулықты емдеп қалпына келтіруге болады, ал өткен уақыт ешқашан қайтып келмейді.",
      "Пайғамбарымыз (с.ғ.с.): «Екі нығмет бар, адамдардың көбі олардың қадірін білмейді: денсаулық және бос уақыт», — деген (әл-Бұхари риуаяты). Бос уақыт — сынақ. Біреу оны білім алуға, отбасына, қайырлы іске жұмсайды, ал біреу мақсатсыз телефон парақтаумен өткізіп алады.",
      "Тағы бір хадисте қиямет күні адам төрт сұраққа жауап бермейінше орнынан қозғала алмайтыны айтылады: өмірін неге жұмсады, білімін қалай қолданды, мал-мүлкін қайдан тауып, неге жұмсады және денесін немен тоздырды (әт-Тирмизи риуаяты). Демек, уақыт — бізге аманатқа берілген дүние, оның есебі сұралады.",
      "Береке қайдан табылады? Пайғамбарымыз: «Аллаһым, үмбетімнің таңғы уақытына береке бере гөр», — деп дұға еткен (Әбу Дәуд, әт-Тирмизи риуаяты). Осы хадисті жеткізген сахаба, саудагер Сахр әл-Ғамиди керуенін әрдайым таңертең аттандыратын, сөйтіп байлығы еселеніп өскен деседі.",
      "Қазіргі ғылым да таңғы сағаттардың құндылығын растайды: ұйқыдан сергек тұрған ми күрделі міндеттерді жеңіл шешеді, назар аз бөлінеді. Таң намазынан кейінгі бір-екі сағат — күннің ең өнімді уақыты. Бұл уақытты маңызды іске, Құран оқуға, жоспарлауға арнаған адам күні бойы алда жүреді.",
      "Мұсылманның күн тәртібінде бес уақыт намаз табиғи тірек қызметін атқарады. Олар күнді бес бөлікке бөліп, әр бөлікте тоқтап, ниетті жаңартуға мүмкіндік береді. Жоспарды намаз уақыттарына байлап құру — уақытты басқарудың қарапайым әрі тиімді тәсілі. Мысалы: таң намазынан кейін — оқу, бесінге дейін — негізгі жұмыс, екіндіден кейін — отбасы.",
      "Берекелі уақыттың тағы бір шарты — басымдықтарды дұрыс белгілеу. Барлық істі бірден қамтуға тырысқан адам көбіне ешқайсысын аяқтай алмайды. Күнге ең маңызды үш мақсат белгілеп, соларды бірінші кезекте орындау — көп адамға көмектескен тәжірибе.",
      "Пайғамбарымыз: «Алла үшін ең сүйікті амал — аз болса да, тұрақты жасалатыны», — деген (әл-Бұхари, Муслим риуаяты). Күн сайын он бет кітап оқу жылына үш мыңнан астам бет болады. Күн сайын он бес минут шет тілін үйрену бір жылда жаңа тілде сөйлеуге жеткізеді. Береке — тұрақтылықта.",
      "Уақытты үнемдеймін деп ұйқыдан қысу — жиі кездесетін қате. Шаршаған адамның бір сағаты сергек адамның жарты сағатындай да нәтиже бермейді. Сүннетте ерте жатып, ерте тұру, түсте қысқа тынығу (қайлула) ұсынылады. Денені күту де — уақыттың берекесін сақтаудың бір жолы.",
      "Келесі тарауларда біз береке кететін әдеттерді — кейінге қалдыруды, шашыраңқы назарды, мақсатсыз әңгімені — жеке қарастырамыз және оларды жеңудің нақты қадамдарын ұсынамыз. Ал әзірге бір қарапайым жаттығудан бастаңыз: ертеңгі күннің ең маңызды үш ісін бүгін кешке қағазға жазып қойыңыз.",
    ],
    quote: "«Заманға ант етейін! Расында, адам зиянда»",
    quoteSource: "Ғаср сүресі, 1–2-аяттар",
  },
  "tapsir-alippesi": {
    foreword: [
      "Құран Кәрім — мұсылманның өмірлік бағдары. Оны оқу — құлшылық, ал түсініп оқу — сол құлшылықтың жемісі. Алайда Құранның терең мағынасын дұрыс ұғыну үшін белгілі бір білім мен әдіс қажет. Осы білімнің жиынтығы тәпсір ғылымы деп аталады.",
      "«Тәпсір әліппесі» — бұл ғылымға алғаш қадам басқысы келетін оқырманға арналған жеңіл кіріспе. Кітапта негізгі ұғымдар, тәпсір әдістері және таңдаулы сүрелердің қысқаша түсіндірмесі берілген.",
      "Бұл демо нұсқада алғашқы тараудың бір бөлігі ұсынылып отыр.",
    ],
    chapter: "Бірінші тарау. Тәпсір деген не?",
    paragraphs: [
      "«Тәпсір» сөзі араб тіліндегі «фассара» етістігінен шыққан, ол «ашу, түсіндіру, анықтау» дегенді білдіреді. Ғылыми мағынада тәпсір — Құран аяттарының мағынасын, түсу себептерін, үкімдері мен тағылымдарын түсіндіретін ғылым. Тәпсірмен айналысатын ғалымды «муфассир» деп атайды.",
      "Тәпсірмен қатар «тәуил» деген ұғым да кездеседі. Ерте кезеңдегі ғалымдар бұл екі сөзді жиі бір мағынада қолданған. Кейінгі ғұламалардың көбі тәпсірді сөздің ашық мағынасын түсіндіру, ал тәуилді сөздің бірнеше ықтимал мағынасының ішінен дәлелге сүйеніп ең дұрысын таңдау деп ажыратады.",
      "Құран таза араб тілінде түскен. Сахабалар оның көп бөлігін тікелей түсінген, ал түсініксіз жерлерін Пайғамбарымыздан (с.ғ.с.) сұрап отырған. Уақыт өте келе Ислам түрлі халықтарға тарады, тіл мен мәдениет өзгерді. Осылайша Құранды дұрыс түсіндіріп беретін арнайы ғылымға қажеттілік туды.",
      "Ғалымдар тәпсірдің дереккөздерін маңыздылығы бойынша былай реттейді. Бірінші — Құранды Құранмен түсіндіру. Бір аятта қысқа айтылған ой басқа аятта толық ашылуы мүмкін. Мысалы, Фатиха сүресіндегі «өздеріне нығмет бергендердің жолы» деген тіркестің кімдер туралы екені Ниса сүресінің 69-аятында түсіндірілген: олар — пайғамбарлар, шыншылдар, шейіттер және ізгі жандар.",
      "Екінші — сүннет. Пайғамбарымыз Құранның алғашқы түсіндірушісі болған. Намаздың қалай оқылатыны, зекеттің мөлшері, қажылықтың рәсімдері Құранда жалпы түрде бұйырылып, сүннетте егжей-тегжейлі көрсетілген.",
      "Үшінші — сахабалардың сөздері. Олар аяттардың түсуіне куә болған, түсу себептерін білген. Сахабалардың ішінде Абдулла ибн Аббас ерекше орын алады. Пайғамбарымыз ол үшін: «Аллаһым, оған Кітапты үйрет», — деп дұға еткен (әл-Бұхари риуаяты). Сондықтан ол «Құранның тәржіманы» деген құрметті атқа ие болды.",
      "Төртінші — араб тілі. Муфассир сөздердің мағынасын, грамматикасын, араб поэзиясы мен шешендік өнерінің ерекшеліктерін жақсы білуі тиіс. Тіл білмей тәпсір жасау — жолды картасыз іздеумен бірдей.",
      "Ғасырлар бойы жүздеген тәпсір кітабы жазылды. Солардың ең танымалдары — имам әт-Табаридің «Джами әл-Баян», имам әл-Құртубидің «Әл-Джами ли-ахкам әл-Құран» және Ибн Кәсирдің «Тәфсир әл-Құран әл-Азим» еңбектері. Қазақ тілінде де Құранның мағыналық аудармалары мен түсіндірмелері жарық көрді.",
      "Тәпсірдің қалай жасалатынын Фатиха сүресінің бір аятымен көрейік: «Біз тек Саған ғана құлшылық етеміз және тек Сенен ғана жәрдем сұраймыз». Араб тілінде «Саған» деген сөз етістіктен бұрын келген. Тіл ғалымдарының түсіндіруінше, бұл құрылым шектеу мағынасын береді: құлшылық та, жәрдем сұрау да тек Аллаға ғана тән.",
      "Аят алдымен құлшылықты, содан кейін жәрдем сұрауды атайды. Муфассирлер мұнда да нәзік мағына көреді: адам алдымен өз міндетін атқарады, содан соң Жаратушысынан көмек тілейді. Әрі бұл құлшылықтың өзі де Алланың жәрдемінсіз мүмкін емес екенін еске салады. Келесі тарауда тәпсір әдістерімен толығырақ танысамыз.",
    ],
    quote: "«Бұл — аяттары жайлы ой жүгіртсін деп саған түсірген берекелі Кітап»",
    quoteSource: "Сад сүресі, 29-аят",
  },
};

/** Generic chapter for demo e-books that have no dedicated text above */
function genericContent(book) {
  return {
    foreword: [
      `«${book.title}» — Nur Karim дүкеніндегі электронды кітаптардың бірі. Электронды нұсқаны бір рет сатып алып, оны телефоннан, планшеттен немесе ноутбуктан кез келген уақытта оқи аласыз.`,
      "Бұл демо нұсқа электронды оқу жүйесінің мүмкіндіктерін көрсету үшін дайындалған.",
    ],
    chapter: "Электронды кітапты қалай оқуға болады",
    paragraphs: [
      "Сатып алған электронды кітаптарыңыз «Менің кітаптарым» бөлімінде сақталады. Кітапты ашу үшін «Оқу» батырмасын басыңыз. Оқу барысы автоматты түрде сақталады, сондықтан келесі жолы тоқтаған жеріңізден жалғастырасыз.",
      "Беттерді батырмалармен, пернетақтадағы көрсеткілермен немесе экранды саусақпен сырғыту арқылы ауыстыруға болады. Ені бойынша немесе бет толық көрінетіндей масштабты таңдаңыз, ал кешке оқығанда қараңғы немесе сепия фонын қосыңыз.",
      "Кітаптар авторлық құқықпен қорғалған. Әр бетте оқырманның жеке су белгісі бар, ал кітапты бір мезгілде шектеулі құрылғыларда ғана ашуға болады. Бұл — авторлар мен баспагерлердің еңбегіне құрмет.",
      "Сұрағыңыз болса, «Хабарламалар» бөлімі арқылы бізге жазыңыз. Жақсы оқу тілейміз!",
    ],
    quote: "«Оқы! Жаратқан Раббыңның атымен»",
    quoteSource: "Алақ сүресі, 1-аят",
  };
}

/* ------------------------------------------------------------------------- */
/* Rendering                                                                  */
/* ------------------------------------------------------------------------- */

function esc(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Pango text block → transparent PNG buffer + size */
async function text(str, { size = 36, color = C.ink, width = TEXT_W, align = "left", justify = false, spacing = 0, letterSpacing = 0 } = {}) {
  const ls = letterSpacing ? ` letter_spacing="${Math.round(letterSpacing * 1024)}"` : "";
  const markup = `<span foreground="${color}"${ls}>${esc(str.replace(/ —/g, "00a0—"))}</span>`;
  const buffer = await sharp({
    text: { text: markup, fontfile: FONT_FILE, font: `Lora ${size}`, width, align, justify, spacing, rgba: true, dpi: 72, wrap: "word" },
  })
    .png()
    .toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width ?? 0, height: meta.height ?? 0 };
}

function backgroundSvg({ header = true, frame = false } = {}) {
  const lines = [];
  if (header) lines.push(`<line x1="${MARGIN_X}" y1="132" x2="${W - MARGIN_X}" y2="132" stroke="${C.gold}" stroke-width="1.5" stroke-opacity="0.7"/>`);
  if (frame) {
    lines.push(`<rect x="70" y="70" width="${W - 140}" height="${H - 140}" fill="none" stroke="${C.gold}" stroke-width="2" stroke-opacity="0.8"/>`);
    lines.push(`<rect x="86" y="86" width="${W - 172}" height="${H - 172}" fill="none" stroke="${C.gold}" stroke-width="1" stroke-opacity="0.45"/>`);
  }
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="${C.paper}"/>${lines.join("")}</svg>`,
  );
}

function diamondSvg(size, color = C.wine) {
  const s = size;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><rect x="${s * 0.2}" y="${s * 0.2}" width="${s * 0.6}" height="${s * 0.6}" fill="${color}" transform="rotate(45 ${s / 2} ${s / 2})"/></svg>`,
  );
}

const centered = (block, top) => ({ input: block.buffer, left: Math.round((W - block.width) / 2), top: Math.round(top) });

async function chrome(book, pageNo, layers, { header = true } = {}) {
  const extra = [];
  if (header) {
    const running = await text(book.title.toLocaleUpperCase("kk"), { size: 20, color: C.muted, align: "center", letterSpacing: 3 });
    extra.push(centered(running, 88));
  }
  const num = await text(String(pageNo), { size: 26, color: C.navy, align: "center" });
  const demo = await text("Демо нұсқа · Nur Karim", { size: 18, color: C.muted, align: "center", letterSpacing: 1 });
  extra.push(centered(num, H - 150), centered(demo, H - 108));
  return sharp(backgroundSvg({ header }))
    .composite([...layers, ...extra])
    .webp({ quality: 86 })
    .toBuffer();
}

async function titlePage(book) {
  const brand = await text("NUR KARIM", { size: 24, color: C.wine, align: "center", letterSpacing: 8 });
  const title = await text(book.title, { size: 84, color: C.navy, align: "center", width: TEXT_W - 40, spacing: 10 });
  const author = await text(book.author, { size: 38, color: C.ink, align: "center" });
  const demo = await text("Электронды кітаптың демо нұсқасы", { size: 26, color: C.muted, align: "center" });
  const place = await text(`Астана · ${new Date().getFullYear()}`, { size: 24, color: C.muted, align: "center", letterSpacing: 2 });
  const titleTop = 640 - title.height / 2;
  const layers = [
    centered(brand, 260),
    { input: diamondSvg(44), left: W / 2 - 22, top: Math.round(titleTop - 110) },
    centered(title, titleTop),
    centered(author, titleTop + title.height + 70),
    centered(demo, 1210),
    centered(place, H - 300),
  ];
  return sharp(backgroundSvg({ header: false, frame: true })).composite(layers).webp({ quality: 86 }).toBuffer();
}

async function infoPage(book, pageNo) {
  const year = new Date().getFullYear();
  const blocks = [
    await text(book.title, { size: 40, color: C.navy, align: "center" }),
    await text(book.author, { size: 30, color: C.ink, align: "center" }),
    await text("Электронды кітаптың демо нұсқасы", { size: 28, color: C.wine, align: "center" }),
    await text(
      "Бұл беттер Nur Karim онлайн-дүкенінің электронды оқу жүйесін көрсету үшін дайындалған. Мәтін кітаптың тақырыбымен таныстыру мақсатында дүкен редакциясымен жазылған және түпнұсқа басылымның мәтіні емес.",
      { size: 28, color: C.ink, justify: true, spacing: 12 },
    ),
    await text(
      "Электронды кітаптар тек сатып алушыға қолжетімді. Әр бетте оқырманның жеке су белгісі көрсетіледі. Кітапты көшіруге, таратуға және басып шығаруға тыйым салынады.",
      { size: 28, color: C.ink, justify: true, spacing: 12 },
    ),
    await text(`© ${year} Nur Karim · Астана`, { size: 26, color: C.muted, align: "center" }),
  ];
  const gaps = [24, 70, 40, 34, 70];
  const total = blocks.reduce((s, b) => s + b.height, 0) + gaps.reduce((s, g) => s + g, 0);
  let y = (H - total) / 2;
  const layers = blocks.map((b, i) => {
    const layer = b.width < TEXT_W - 4 ? centered(b, y) : { input: b.buffer, left: MARGIN_X, top: Math.round(y) };
    y += b.height + (gaps[i] ?? 0);
    return layer;
  });
  return chrome(book, pageNo, layers, { header: false });
}

async function contentsPage(book, pageNo, entries) {
  const heading = await text("Мазмұны", { size: 56, color: C.navy, align: "center" });
  const layers = [centered(heading, 300), { input: diamondSvg(28), left: W / 2 - 14, top: 300 + heading.height + 28 }];
  let y = 300 + heading.height + 110;
  for (const entry of entries) {
    const label = await text(entry.label, { size: 32, color: C.ink, width: TEXT_W - 120 });
    const num = await text(String(entry.page), { size: 32, color: C.wine });
    layers.push({ input: label.buffer, left: MARGIN_X, top: Math.round(y) });
    layers.push({ input: num.buffer, left: W - MARGIN_X - num.width, top: Math.round(y + label.height - num.height) });
    const dots = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${TEXT_W}" height="4"><line x1="0" y1="2" x2="${TEXT_W}" y2="2" stroke="${C.gold}" stroke-width="2" stroke-dasharray="2 10" stroke-opacity="0.8"/></svg>`,
    );
    layers.push({ input: dots, left: MARGIN_X, top: Math.round(y + label.height + 18) });
    y += label.height + 60;
  }
  return chrome(book, pageNo, layers);
}

const BODY = { size: 36, color: C.ink, justify: true, spacing: 16 };
const PARA_GAP = 26;
const INDENT = "  ";

/** Lays paragraphs out on pages, splitting long paragraphs by sentences. */
async function flowParagraphs(paragraphs, firstPageTop) {
  const pages = [[]];
  let y = firstPageTop;
  let current = pages[0];
  const newPage = () => {
    current = [];
    pages.push(current);
    y = TEXT_TOP;
  };

  for (const paragraph of paragraphs) {
    let remaining = paragraph;
    let indent = true;
    while (remaining) {
      const block = await text((indent ? INDENT : "") + remaining, BODY);
      if (y + block.height <= TEXT_BOTTOM) {
        current.push({ input: block.buffer, left: MARGIN_X, top: Math.round(y) });
        y += block.height + PARA_GAP;
        remaining = "";
        break;
      }
      // Fit as many sentences as possible on this page
      const sentences = remaining.match(/[^.!?…]+[.!?…]+[»"]?\s*|[^.!?…]+$/g) ?? [remaining];
      let fitted = null;
      for (let n = sentences.length - 1; n >= 1; n--) {
        const part = sentences.slice(0, n).join("").trim();
        const candidate = await text((indent ? INDENT : "") + part, BODY);
        if (y + candidate.height <= TEXT_BOTTOM) {
          fitted = { block: candidate, rest: sentences.slice(n).join("").trim() };
          break;
        }
      }
      if (fitted) {
        current.push({ input: fitted.block.buffer, left: MARGIN_X, top: Math.round(y) });
        remaining = fitted.rest;
        indent = false;
      }
      newPage();
    }
  }
  return pages.filter((p) => p.length > 0);
}

async function headingBlock(label, top) {
  const heading = await text(label, { size: 46, color: C.navy, align: "center", width: TEXT_W - 60, spacing: 8 });
  const layers = [
    { input: diamondSvg(28), left: W / 2 - 14, top },
    centered(heading, top + 60),
  ];
  return { layers, bottom: top + 60 + heading.height + 70 };
}

async function quotePage(book, pageNo, quote, source) {
  const q = await text(quote, { size: 50, color: C.navy, align: "center", width: TEXT_W - 80, spacing: 14 });
  const s = await text(`— ${source}`, { size: 30, color: C.wine, align: "center" });
  const top = (H - q.height) / 2 - 40;
  return chrome(book, pageNo, [
    { input: diamondSvg(36), left: W / 2 - 18, top: Math.round(top - 110) },
    centered(q, top),
    centered(s, top + q.height + 50),
  ]);
}

async function endPage(book, pageNo) {
  const title = await text("Демо нұсқа осымен аяқталады", { size: 48, color: C.navy, align: "center", width: TEXT_W - 80 });
  const body = await text(
    "Толық кітапты Nur Karim дүкенінен электронды немесе қағаз нұсқада сатып алуға болады. Электронды кітап сіздің кітапханаңызда мәңгі сақталады.",
    { size: 30, color: C.ink, align: "center", width: TEXT_W - 80, spacing: 12 },
  );
  const site = await text("Nur Karim · кітап дүкені", { size: 28, color: C.wine, align: "center", letterSpacing: 2 });
  const top = 620;
  return chrome(book, pageNo, [
    { input: diamondSvg(44), left: W / 2 - 22, top: top - 120 },
    centered(title, top),
    centered(body, top + title.height + 60),
    centered(site, top + title.height + 60 + body.height + 90),
  ]);
}

async function buildBook(book) {
  const content = CONTENT[book.slug] ?? genericContent(book);
  const pages = [];
  pages.push(await titlePage(book)); // 1
  pages.push(await infoPage(book, 2)); // 2
  const contentsIndex = pages.push(null) - 1; // 3 (filled later)

  // Foreword
  const forewordNo = pages.length + 1;
  const fw = await headingBlock("Алғысөз", TEXT_TOP + 20);
  const fwPages = await flowParagraphs(content.foreword, fw.bottom);
  fwPages[0].unshift(...fw.layers);
  for (const layers of fwPages) pages.push(await chrome(book, pages.length + 1, layers));

  // Chapter
  const chapterNo = pages.length + 1;
  const ch = await headingBlock(content.chapter, TEXT_TOP + 60);
  const chPages = await flowParagraphs(content.paragraphs, ch.bottom);
  chPages[0].unshift(...ch.layers);
  for (const layers of chPages) pages.push(await chrome(book, pages.length + 1, layers));

  pages.push(await quotePage(book, pages.length + 1, content.quote, content.quoteSource));
  const endNo = pages.length + 1;
  pages.push(await endPage(book, endNo));

  pages[contentsIndex] = await contentsPage(book, contentsIndex + 1, [
    { label: "Алғысөз", page: forewordNo },
    { label: content.chapter, page: chapterNo },
    { label: "Демо нұсқаның соңы", page: endNo },
  ]);
  return pages;
}

/* ------------------------------------------------------------------------- */
/* Upload                                                                     */
/* ------------------------------------------------------------------------- */

async function listAll(storage, folder) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.list(folder, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function removeFolder(storage, folder) {
  const files = (await listAll(storage, folder)).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
  for (let i = 0; i < files.length; i += 100) {
    const { error } = await storage.remove(files.slice(i, i + 100));
    if (error) throw error;
  }
  return files.length;
}

async function uploadWithRetry(storage, filePath, body) {
  for (let attempt = 1; ; attempt++) {
    const { error } = await storage.upload(filePath, body, { contentType: "image/webp", upsert: true, cacheControl: "3600" });
    if (!error) return;
    if (attempt >= 3) throw error;
    await new Promise((r) => setTimeout(r, 700 * attempt));
  }
}

async function main() {
  if (!fs.existsSync(FONT_FILE)) throw new Error(`Font not found: ${FONT_FILE}`);
  const dryArg = process.argv.find((a) => a.startsWith("--dry"));
  const dryDir = dryArg ? dryArg.split("=")[1] || "ebook-preview" : null;

  const { url, service } = loadEnv();
  const supabase = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: books, error } = await supabase
    .from("books")
    .select("id, slug, title, author, ebook_preview_pages")
    .eq("is_demo", true)
    .eq("ebook_enabled", true)
    .order("catalog_no");
  if (error) throw error;
  if (!books?.length) {
    console.log("No demo e-books found.");
    return;
  }

  const storage = supabase.storage.from(BUCKET);
  for (const book of books) {
    const started = Date.now();
    const pages = await buildBook(book);

    if (dryDir) {
      fs.mkdirSync(dryDir, { recursive: true });
      for (let i = 0; i < pages.length; i++) {
        await sharp(pages[i]).png().toFile(path.join(dryDir, `${book.slug}-${i + 1}.png`));
      }
      console.log(`✔ ${book.title}: ${pages.length} pages rendered to ${dryDir}`);
      continue;
    }

    const folder = `${book.id}/v${VERSION}`;
    // Stale pages from an older run with more pages
    const existing = await listAll(storage, folder);
    const stale = existing
      .filter((f) => f.id && Number.parseInt(f.name, 10) > pages.length)
      .map((f) => `${folder}/${f.name}`);
    if (stale.length) await storage.remove(stale);

    for (let i = 0; i < pages.length; i += 4) {
      await Promise.all(pages.slice(i, i + 4).map((body, j) => uploadWithRetry(storage, `${folder}/${i + j + 1}.webp`, body)));
    }

    const previewPages = Math.min(Math.max(book.ebook_preview_pages || 5, 1), pages.length);
    const { error: updateError } = await supabase
      .from("books")
      .update({ ebook_page_count: pages.length, ebook_version: VERSION, ebook_preview_pages: previewPages })
      .eq("id", book.id);
    if (updateError) throw updateError;

    // Remove other versions (e.g. test uploads) and their source PDFs
    const root = await listAll(storage, book.id);
    for (const entry of root) {
      if (!entry.id && entry.name !== `v${VERSION}`) await removeFolder(storage, `${book.id}/${entry.name}`);
    }

    console.log(`✔ ${book.title}: ${pages.length} pages uploaded to ${BUCKET}/${folder} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
