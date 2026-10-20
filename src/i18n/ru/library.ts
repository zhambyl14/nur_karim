import type { Dictionary } from "../kk";

const library: Dictionary["library"] = {
  metaTitle: "Мои книги",
  title: "Мои книги",
  roleClient: "Клиент · с {year} года",
  roleAdmin: "Администратор · с {year} года",
  tabs: {
    label: "Разделы библиотеки",
    ebooks: "Электронные · {count}",
    orders: "Заказы · {count}",
  },
  reading: {
    eyebrow: "ВЫ ЧИТАЕТЕ",
    progress: "{percent}%",
    pageOf: "{page} / {total} стр.",
    continue: "Продолжить",
  },
  item: {
    ebook: "Электронная",
    progress: "прочитано {percent}%",
    finished: "прочитана",
    new: "новая",
    preparing: "готовится",
    read: "Читать",
    gift: "Подарок",
    preparingHint: "Страницы книги загружаются. Вы сможете читать, когда всё будет готово.",
    openBook: "Перейти на страницу книги",
  },
  empty: {
    title: "Электронных книг пока нет",
    text: "Купите электронную книгу один раз — она сохранится здесь, и вы сможете читать её с любого устройства.",
    cta: "Смотреть электронные книги",
  },
  orders: {
    title: "Заказ {number}",
    items: "{count} книга|{count} книги|{count} книг",
    empty: "Заказов пока нет",
    emptyText: "Выберите книгу в каталоге и оформите первый заказ.",
    toCatalog: "Перейти в каталог",
    all: "Все заказы",
    steps: "Ход заказа: {done} из 3",
    digital: "Электронный",
  },
};

export default library;
