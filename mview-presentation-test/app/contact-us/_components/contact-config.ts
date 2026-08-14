/**
 * Static Contact-page details. Mirrored from the prototype's `route:contact`.
 * Values are content, not layout — edit them here.
 */
export const contactConfig = {
  supportEmail: "support@mineralview.com",
  phone: { display: "(866) 646-8439", href: "tel:+18666468439" },
  email: { display: "support@mineralview.com", href: "mailto:support@mineralview.com" },
  address: ["7301 Ranch Road", "620 N Suite 155-194", "Austin, TX 78726-4537"],
  hours: [
    { label: "Monday – Friday", value: "8:00 AM – 5:00 PM" },
    { label: "Saturday & Sunday", value: "Closed" },
  ],
} as const;
