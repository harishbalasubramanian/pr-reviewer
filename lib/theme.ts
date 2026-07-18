import { createTheme } from "@mui/material/styles";

// App-wide MUI theme. Adjust palette tokens here to restyle the whole app.
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0969da", // GitHub blue
    },
    background: {
      default: "#f6f8fa", // GitHub's page background
      paper: "#ffffff",
    },
    text: {
      primary: "#1f2328",
      secondary: "#656d76",
    },
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      "Helvetica",
      "Arial",
      "sans-serif",
    ].join(","),
  },
  shape: {
    borderRadius: 6,
  },
});

export default theme;
