import type { Dictionary } from "../kk";

const authors: Dictionary["authors"] = {
  meta: {
    title: "Авторы",
    description: "Все авторы магазина Nur Karim по алфавиту. Все книги автора на одной странице.",
  },
  title: "Авторы",
  count: "{count} автор|{count} автора|{count} авторов",
  searchLabel: "Поиск автора",
  searchPlaceholder: "Имя автора…",
  books: "{count} книга|{count} книги|{count} книг",
  lettersLabel: "Перейти к букве",
  other: "#",
  empty: {
    title: "Авторов пока нет",
    text: "Авторы появятся здесь, когда в каталог добавят книги.",
  },
  noResults: {
    title: "Автор не найден",
    text: "По запросу «{q}» никого не нашлось. Попробуйте написать иначе.",
  },
  toCatalog: "Перейти в каталог",
};

export default authors;
