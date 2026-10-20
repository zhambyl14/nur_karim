import type { Dictionary } from "../../kk";

const messages: Dictionary["admin"]["messages"] = {
  metaTitle: "Сообщения",
  title: "Сообщения",
  description: "Личные вопросы клиентов: о книгах, заказах и общие вопросы.",
  searchPlaceholder: "Имя или телефон клиента…",
  searchLabel: "Поиск сообщений",
  filters: {
    all: "Все",
    unread: "Непрочитанные",
  },
  total: "{count} диалог|{count} диалога|{count} диалогов",
  you: "Вы:",
  noName: "Имя не указано",
  generalSubject: "Общий вопрос",
  orderSubject: "Заказ {number}",
  empty: {
    title: "Сообщений нет",
    text: "Когда клиенты зададут вопрос со страницы книги или из личного кабинета, он появится здесь.",
    searchTitle: "Ничего не найдено",
    searchText: "Попробуйте поискать по другому имени или номеру телефона.",
    unreadTitle: "Все сообщения прочитаны",
    unreadText: "Новые сообщения появятся здесь.",
  },
  client: {
    title: "Клиент",
    phone: "Телефон",
    telegram: "Telegram",
    telegramLinked: "Подключён",
    telegramNone: "Не подключён",
    since: "Дата регистрации",
    orders: "Заказы клиента",
    profile: "Профиль клиента",
    call: "Позвонить",
    whatsapp: "WhatsApp",
  },
  context: {
    title: "Тема вопроса",
    book: "Книга",
    order: "Заказ",
    general: "Общий вопрос",
    openBook: "Открыть книгу на сайте",
    editBook: "Редактировать книгу",
    openOrder: "Открыть заказ",
  },
  back: "Все сообщения",
  replyPlaceholder: "Напишите ответ клиенту…",
  replyHint: "Ответ будет доставлен клиенту на сайте и в Telegram.",
  replyHintNoTelegram: "Клиент не подключил Telegram: ответ он увидит в разделе «Сообщения» на сайте.",
};

export default messages;
