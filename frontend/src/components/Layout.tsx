import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Box,
  Burger,
  Button,
  Container,
  Group,
  Menu,
  Text,
  UnstyledButton,
  rem,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAuth } from "../context/AuthContext";
import { GovernmentHeader } from "./GovernmentHeader";

const navItems = [
  { to: "/", label: "Inicio", end: true, adminOnly: false },
  { to: "/refugios", label: "Centros", adminOnly: false },
  { to: "/refugiados", label: "Afectados", adminOnly: false },
  { to: "/estadisticas", label: "Estadísticas", adminOnly: false },
  { to: "/usuarios", label: "Usuarios", adminOnly: true },
];

export function Layout({ children }: { children?: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [opened, { toggle, close }] = useDisclosure();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const items = navItems
    .filter((item) => !item.adminOnly || isAdmin)
    .map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={close}
        className={({ isActive }) =>
          `gov-nav-link ${isActive ? "gov-nav-link--active" : ""}`
        }
        style={({ isActive }) => ({
          display: "block",
          padding: `${rem(8)} ${rem(14)}`,
          borderRadius: rem(4),
          textDecoration: "none",
          color: isActive ? "#1e3a5f" : "#ffffff",
          background: isActive ? "#fcd116" : "transparent",
          fontWeight: isActive ? 700 : 500,
          fontSize: rem(15),
          border: isActive ? "1px solid #c79a00" : "1px solid transparent",
          transition: "all .15s ease",
        })}
      >
        {item.label}
      </NavLink>
    ));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <a href="#main-content" className="gov-skip-link">
        Saltar al contenido principal
      </a>
      <GovernmentHeader />
      <div
        style={{
          background: "rgba(30, 58, 95, 0.78)",
          color: "#fff",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(10px) saturate(140%)",
          WebkitBackdropFilter: "blur(10px) saturate(140%)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Container size="xl" px="md">
          <Group justify="space-between" wrap="nowrap" gap="md" py={6}>
            <Group gap="xs" wrap="nowrap" style={{ flex: 1 }}>
              <Burger
                opened={opened}
                onClick={toggle}
                size="sm"
                color="#fff"
                aria-label="Abrir menú de navegación"
                hiddenFrom="md"
              />
              <nav
                aria-label="Navegación principal"
                className="hidden md:!flex"
                style={{ display: "flex", gap: rem(4), flexWrap: "wrap" }}
              >
                {items}
              </nav>
            </Group>
            <Group gap="sm" wrap="nowrap" visibleFrom="sm">
              <Text size="sm" style={{ color: "#fff" }}>
                {user?.nombre} {user?.apellido}{" "}
                <Text component="span" size="xs" style={{ color: "#fcd116", fontWeight: 700 }}>
                  · {user?.rol}
                </Text>
              </Text>
              <Button
                onClick={handleLogout}
                variant="outline"
                color="govYellow"
                size="xs"
                radius="sm"
                aria-label="Cerrar sesión"
              >
                Cerrar sesión
              </Button>
            </Group>
            <Box hiddenFrom="sm">
              <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <UnstyledButton
                  aria-label="Menú de usuario"
                  style={{
                    color: "#fff",
                    padding: rem(6),
                    borderRadius: rem(4),
                    border: "1px solid rgba(255,255,255,0.3)",
                  }}
                >
                  <Text size="sm" fw={600}>
                    {user?.nombre?.charAt(0)}
                    {user?.apellido?.charAt(0)}
                  </Text>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  {user?.nombre} {user?.apellido} ({user?.rol})
                </Menu.Label>
                <Menu.Item onClick={handleLogout} color="govRed.6">
                  Cerrar sesión
                </Menu.Item>
              </Menu.Dropdown>
              </Menu>
            </Box>
          </Group>
          {opened && (
            <nav
              aria-label="Navegación móvil"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: rem(4),
                paddingBottom: rem(8),
              }}
            >
              {items.map((it, i) => (
                <div key={i}>{it}</div>
              ))}
              <Button
                onClick={handleLogout}
                variant="outline"
                color="govYellow"
                size="sm"
                radius="sm"
                mt={6}
                fullWidth
              >
                Cerrar sesión
              </Button>
            </nav>
          )}
        </Container>
      </div>
      <main
        id="main-content"
        tabIndex={-1}
        style={{
          flex: 1,
          padding: "1.5rem",
          maxWidth: 1280,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {children ?? <Outlet />}
      </main>
      <AppShellFooter />
    </div>
  );
}

function AppShellFooter() {
  return (
    <footer
      role="contentinfo"
      style={{
        padding: "0.9rem 1.5rem",
        background: "#1e3a5f",
        color: "#fff",
        fontSize: "0.8rem",
        textAlign: "center",
        borderTop: "3px solid #fcd116",
      }}
    >
      <Text size="xs" style={{ color: "#fff" }}>
        Sistema de censo gubernamental · Ministerio del Poder Popular de Desarrollo Minero
        Ecológico e Industrias Básicas · Sistema de Censo de Centros · Uso oficial restringido
      </Text>
    </footer>
  );
}
