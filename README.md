# Contador de calorias

Web personal para registrar comidas, ejercicio, peso y evolucion usando Supabase como base de datos.

## Configuracion

1. Crea un proyecto en Supabase.
2. Abre el SQL editor de Supabase y ejecuta el contenido de `supabase-schema.sql`.
3. En Supabase, ve a `Project settings > API` y copia:
   - Project URL
   - anon public key
4. En `Authentication > Providers > Email`, desactiva el registro publico si aparece como opcion disponible.
5. Crea los usuarios manualmente desde `Authentication > Users > Add user`.
6. Edita `config.js` y sustituye los dos valores de ejemplo.
7. Abre `index.html` en el navegador.

Si ya habias creado la base de datos antes de existir la gestion de catalogo/admin, ejecuta tambien el contenido de `supabase-admin-update.sql` en el SQL editor de Supabase.

Para marcar tu usuario como admin, cambia el email y ejecuta esto en Supabase:

```sql
insert into public.profiles (id, is_admin)
select id, true from auth.users where email = 'TU_EMAIL'
on conflict (id) do update set is_admin = true;
```

## Notas

- La autenticacion usa Supabase Auth con email y contrasena, pero la web solo permite iniciar sesion.
- Cada usuario solo puede ver y editar sus propios registros gracias a Row Level Security.
- Los alimentos y deportes publicos solo los puede crear, editar o borrar un admin.
- Los usuarios normales solo pueden crear, editar y borrar alimentos y deportes propios.
