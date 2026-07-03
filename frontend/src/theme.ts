import { createTheme, type MantineColorsTuple } from "@mantine/core";

const govBlue: MantineColorsTuple = [
  "#eef3f9",
  "#d6e0ec",
  "#a8bcd4",
  "#7896bd",
  "#5275a8",
  "#3b5f97",
  "#2e538b",
  "#1e3a5f",
  "#19324f",
  "#0e2640",
];

const govYellow: MantineColorsTuple = [
  "#fff8e1",
  "#ffeeb3",
  "#ffe082",
  "#ffd54f",
  "#ffca28",
  "#fcd116",
  "#f5b800",
  "#c79a00",
  "#9b7a00",
  "#6f5800",
];

const govRed: MantineColorsTuple = [
  "#ffebee",
  "#ffcdd2",
  "#ef9a9a",
  "#e57373",
  "#ef5350",
  "#ce1126",
  "#c01020",
  "#a30d1b",
  "#860a16",
  "#690711",
];

const govGreen: MantineColorsTuple = [
  "#e8f5e9",
  "#c8e6c9",
  "#a5d6a7",
  "#81c784",
  "#66bb6a",
  "#2e7d32",
  "#006847",
  "#00563a",
  "#00432d",
  "#003020",
];

export const theme = createTheme({
  primaryColor: "govBlue",
  primaryShade: 7,
  fontFamily: "Georama, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  fontFamilyMonospace: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  defaultRadius: "sm",
  colors: {
    govBlue,
    govYellow,
    govRed,
    govGreen,
  },
  headings: {
    fontFamily: "Georama, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontWeight: "700",
  },
  components: {
    Button: {
      defaultProps: {
        radius: "sm",
      },
    },
    Card: {
      defaultProps: {
        radius: "md",
        withBorder: true,
        shadow: "none",
      },
    },
    Paper: {
      defaultProps: {
        radius: "md",
      },
    },
    Modal: {
      defaultProps: {
        centered: true,
        radius: "md",
        overlayProps: { backgroundOpacity: 0.5, blur: 0 },
      },
    },
  },
});
