import { createCn } from "cn/config";

// The theme replaces Tailwind's text-xs/sm/… scale with px-named sizes and adds
// named shadows. Without registering them, cn() reads "text-13" as a color and
// drops it when merged with "text-ink".
export const cn = createCn({
  extend: {
    theme: {
      text: ["10", "11", "12", "13", "14", "15", "17", "20", "22", "28", "30", "32"],
      shadow: ["dialog", "card", "menu"],
    },
  },
});
