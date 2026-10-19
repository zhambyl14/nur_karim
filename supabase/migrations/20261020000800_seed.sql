-- Nur Karim: initial genres and demo catalog (from the Claude Design mockups).
-- Demo rows have is_demo = true and can be removed from Admin → Settings.

insert into public.genres (slug, name_kk, name_ru, sort_order) values
  ('dini', 'Діни кітаптар', 'Религиозные книги', 10),
  ('tarikh', 'Тарих', 'История', 20),
  ('damytu', 'Өзін-өзі дамыту', 'Саморазвитие', 30),
  ('adebiet', 'Әдебиет', 'Литература', 40),
  ('balalar', 'Балаларға', 'Детям', 50),
  ('baska', 'Басқа', 'Другое', 90)
on conflict (slug) do nothing;

with g as (select id, slug from public.genres)
insert into public.books (
  slug, title, author, genre_id, description_kk, description_ru, language, publisher, publish_year,
  pages, cover_type, cover_palette, tags, paper_enabled, paper_price, stock,
  ebook_enabled, ebook_price, ebook_preview_pages, is_featured, is_published, is_demo, created_at
)
select
  v.slug, v.title, v.author, (select id from g where g.slug = v.genre), v.dkk, v.dru, 'kk', v.publisher, v.year,
  v.pages, v.cover_type, v.palette, v.tags, v.paper, v.paper_price, v.stock,
  v.ebook, v.ebook_price, v.preview, v.featured, true, true, now() - (v.age || ' days')::interval
from (values
  ('azhurrumiya-matinine-tusindirme', 'Әжуррумия мәтініне түсіндірме', 'Ибн Әжуррум', 'dini',
   'Араб тілі грамматикасының классикалық мәтіні — «Әжуррумия» мен оған жазылған түсінікті шарх. Медресе шәкірттеріне және араб тілін өз бетінше үйренушілерге арналған.',
   'Классический текст арабской грамматики «Аджуррумия» с понятным комментарием. Для учащихся медресе и всех, кто изучает арабский самостоятельно.',
   'Nur Karim', 2024, 184, 'soft', 0, array['араб тілі', 'грамматика'], true, 4500, 11, false, null::int, 0, false, 12),
  ('akesinin-kyzy', 'Әкесінің қызы', 'Айгүл Сәрсенова', 'adebiet',
   'Әке мен қыз арасындағы нәзік байланыс, отбасы құндылықтары мен ұрпақ сабақтастығы туралы жылы әңгімелер жинағы.',
   'Тёплый сборник рассказов о связи отца и дочери, семейных ценностях и преемственности поколений.',
   'Nur Karim', 2023, 236, 'hard', 1, array['отбасы', 'әңгімелер'], true, 3200, 3, false, null::int, 0, false, 30),
  ('babalar-izimen', 'Бабалар ізімен', 'Ерлан Тоқтар', 'tarikh',
   'Ұлы Даланың тарихи тұлғалары мен оқиғалары туралы танымдық кітап. Деректер мен аңыздар қарапайым тілмен баяндалады.',
   'Познавательная книга о личностях и событиях Великой Степи. Факты и легенды изложены простым языком.',
   'Nur Karim', 2024, 328, 'hard', 2, array['қазақ тарихы'], true, 5900, 9, false, null::int, 0, false, 8),
  ('gibadat-tutkasy-mukhtasar', 'Ғибадат тұтқасы. Мұхтасар', 'Әбу Шужа', 'dini',
   'Ханафи мазһабы бойынша ғибадат үкімдерінің қысқаша әрі жүйелі баяндамасы: дәрет, намаз, ораза, зекет.',
   'Краткое и системное изложение положений поклонения: омовение, намаз, пост, закят.',
   'Nur Karim', 2022, 152, 'soft', 3, array['фиқһ', 'намаз'], true, 3800, 4, false, null::int, 0, false, 45),
  ('paigambar-omiri', 'Пайғамбар өмірі', 'С. Мубаракфури', 'dini',
   'Мұхаммед пайғамбардың (с.ғ.с.) өмірбаяны — «Ар-Рахиқ әл-Мәхтум» еңбегінің қазақша аудармасы. Сенімді дереккөздерге негізделген.',
   'Жизнеописание Пророка Мухаммада ﷺ — казахский перевод труда «Ар-Рахик аль-Махтум», основанного на достоверных источниках.',
   'Nur Karim', 2024, 560, 'hard', 1, array['сира', 'өмірбаян'], true, 6500, 17, true, 3900, 5, false, 5),
  ('zhurek-tazalygy', 'Жүрек тазалығы', 'Имам Ғазали', 'dini',
   'Ішкі тазалық, ниет және ықылас туралы классикалық еңбек. Күнделікті өмірге жақын, түсінікті аудармада.',
   'Классический труд о внутренней чистоте, намерении и искренности — в близком к жизни, понятном переводе.',
   'Nur Karim', 2023, 312, 'hard', 0, array['тазкия', 'ахлақ'], true, 4200, 14, true, 2500, 5, true, 3),
  ('kazak-khandygy-tarikhy', 'Қазақ хандығы тарихы', 'Қ. Жүсіп', 'tarikh',
   'Қазақ хандығының құрылуынан бастап XVIII ғасырға дейінгі саяси және мәдени тарихы. Карталар мен хронологиясымен.',
   'Политическая и культурная история Казахского ханства от основания до XVIII века. С картами и хронологией.',
   'Nur Karim', 2021, 412, 'hard', 2, array['хандық', 'тарих'], true, 7400, 2, false, null::int, 0, false, 60),
  ('uakyt-bereketi', 'Уақыт берекеті', 'Мұхаммед Ауад', 'damytu',
   'Уақытты берекелі пайдалану, күн тәртібі және мақсат қою туралы практикалық кітап. Иман мен өнімділікті ұштастырады.',
   'Практическая книга о благословенном использовании времени, распорядке дня и постановке целей.',
   'Nur Karim', 2024, 208, 'soft', 3, array['тайм-менеджмент'], true, 2900, 21, true, 1900, 5, false, 2),
  ('akhlak-negizderi', 'Ахлақ негіздері', 'А. Нұрлан', 'dini',
   'Көркем мінез, әдеп және адамдармен қарым-қатынас мәдениеті туралы қысқа да нұсқа кітап.',
   'Краткая книга о благом нраве, этикете и культуре общения с людьми.',
   'Nur Karim', 2022, 176, 'soft', 1, array['ахлақ', 'әдеп'], true, 3600, 13, false, null::int, 0, false, 21),
  ('tapsir-alippesi', 'Тәпсір әліппесі', 'М. Сейіт', 'dini',
   'Құран тәпсіріне алғашқы қадам: негізгі ұғымдар, тәпсір әдістері және таңдаулы сүрелердің түсіндірмесі.',
   'Первый шаг к тафсиру Корана: основные понятия, методы толкования и разбор избранных сур.',
   'Nur Karim', 2025, 264, 'hard', 0, array['тәпсір', 'Құран'], true, 5200, 7, true, 3100, 5, false, 1),
  ('paigambarlar-kissasy-balalarga', 'Пайғамбарлар қиссасы балаларға', 'Ә. Қали', 'balalar',
   'Пайғамбарлар туралы қысқа, суретті әңгімелер. Ата-ана мен баланың бірге оқуына арналған.',
   'Короткие иллюстрированные истории о пророках для совместного чтения родителей и детей.',
   'Nur Karim', 2024, 96, 'hard', 2, array['балалар', 'қисса'], true, 3400, 18, false, null::int, 0, false, 15),
  ('kishkentai-musylmannyn-adebi', 'Кішкентай мұсылманның әдебі', 'А. Сейітқызы', 'balalar',
   'Балаларға күнделікті әдептерді ойын арқылы үйрететін түрлі түсті кітап: сәлемдесу, ас ішу, үлкенді құрметтеу.',
   'Яркая книга, которая в игровой форме учит детей ежедневному этикету.',
   'Nur Karim', 2025, 64, 'soft', 3, array['балалар', 'әдеп'], true, 2800, 25, false, null::int, 0, false, 6)
) as v (slug, title, author, genre, dkk, dru, publisher, year, pages, cover_type, palette, tags,
        paper, paper_price, stock, ebook, ebook_price, preview, featured, age)
on conflict (slug) do nothing;

-- Demo promotion and promo code (marked as demo)
insert into public.promotions (title_kk, title_ru, discount_type, discount_value, scope, genre_id, format_scope, is_active, is_demo)
select 'Тарих апталығы', 'Неделя истории', 'percent', 10, 'genre', g.id, 'any', true, true
from public.genres g where g.slug = 'tarikh'
and not exists (select 1 from public.promotions where is_demo);

insert into public.promo_codes (code, description, discount_type, discount_value, scope, min_order_amount, per_user_limit, is_active, is_demo)
values ('NURKARIM10', 'Демо промокод: барлық кітапқа −10%', 'percent', 10, 'all', 3000, 1, true, true)
on conflict (code) do nothing;

-- Demo data cleanup used by the admin settings page
create or replace function public.admin_delete_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_books int;
  v_promotions int;
  v_codes int;
  v_banners int;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  delete from public.promotions where is_demo;
  get diagnostics v_promotions = row_count;
  delete from public.promo_codes where is_demo
    and not exists (select 1 from public.promo_code_uses u where u.promo_code_id = promo_codes.id);
  get diagnostics v_codes = row_count;
  delete from public.banners where is_demo;
  get diagnostics v_banners = row_count;
  -- books that were ordered stay but are hidden, the rest are deleted
  update public.books set is_published = false
  where is_demo and exists (select 1 from public.order_items oi where oi.book_id = books.id);
  delete from public.books
  where is_demo and not exists (select 1 from public.order_items oi where oi.book_id = books.id);
  get diagnostics v_books = row_count;
  return jsonb_build_object('books', v_books, 'promotions', v_promotions, 'promo_codes', v_codes, 'banners', v_banners);
end
$$;

revoke execute on function public.admin_delete_demo_data() from public, anon;
grant execute on function public.admin_delete_demo_data() to authenticated;
