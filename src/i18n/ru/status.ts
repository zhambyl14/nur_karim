import type { Dictionary } from "../kk";

const status: Dictionary["status"] = {
  order: {
    pending_payment: "Ожидает оплаты",
    payment_review: "Оплата проверяется",
    paid: "Оплачен",
    shipped: "В пути",
    delivered: "Доставлен",
    cancelled: "Отменён",
  },
  orderDigitalDelivered: "Выполнен",
  gift: {
    pending: "Ожидает оплаты",
    active: "Активен",
    opened: "Открыт",
    claimed: "Принят",
    cancelled: "Отменён",
  },
  delivery: {
    astana_courier: "Курьер по Астане",
    kazpost: "Казпочтой",
    digital: "Электронно (без доставки)",
  },
  deliveryShort: {
    astana_courier: "Курьер",
    kazpost: "Казпочта",
    digital: "Онлайн",
  },
};

export default status;
