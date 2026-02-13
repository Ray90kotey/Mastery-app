## Packages
(none needed)

## Notes
Fonts: use existing Google Fonts in index.html; index.css sets --font-display and --font-body.
All API calls use @shared/routes + Zod safeParse with logging.
Auth: use existing /api/login, /api/logout, /api/auth/user via useAuth hook.
WhatsApp share uses https://wa.me/?text=... with encoded message including report URL.
Document title/meta handled via a small Meta helper component (no react-helmet).
Tailwind: no config changes required (use CSS variables in base layer for display/body fonts).
