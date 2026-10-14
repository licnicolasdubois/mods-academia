# Mods de Claude Code

Los tres mods de la clase «Mods de Claude Code» de la Academia de
[Nicolás Dubois](https://licnicolasdubois.com). Un mod es código que corre adentro de Claude Code:
puede frenar algo antes de que pase, dibujar en pantalla o sumar un comando.

| Mod | Qué hace |
|---|---|
| **guardia** | No deja leer ni tocar archivos `.env` (sí el `.env.example`) ni correr `rm -rf`. Si la guardia misma falla, frena igual. |
| **reloj-cache** | Arriba del prompt, cuántos minutos le quedan a la caché y cuántos tokens guarda, con un botón **Compactar**. Avisa cuando faltan 5 minutos. La duración (60 min) y el aviso (5 min) se cambian en `/config`. |
| **grabando** | `/grabando` prende y apaga el modo grabación: en pantalla tapa mails, teléfonos y montos, en tus mensajes, en las respuestas y en lo que devuelven las herramientas. Se acuerda si estaba prendido. |

## Instalarlos

En la terminal, adentro de Claude Code (cambiá `guardia` por `reloj-cache` o `grabando`):

```
/plugin install guardia --marketplace licnicolasdubois/mods-academia
```

Te pregunta si querés agregar el marketplace (`y`) y en qué alcance instalarlo: para todos tus
proyectos o para uno solo.

Desde la línea de comandos:

```
claude plugin install guardia --marketplace licnicolasdubois/mods-academia
```

En la app de escritorio, donde `/plugin` no anda: el **+** al lado del prompt → **Plugins** →
**Add marketplace** con `licnicolasdubois/mods-academia` → **Add plugin**.

## Probarlos

Cada mod trae sus pruebas:

```
claude plugin validate guardia
claude plugin test guardia
```

## Antes de usarlos en serio

- Los mods son nuevos y su API cambia entre versiones de Claude Code. Estos se probaron con la 2.1.295
  y la 2.1.300. Si uno deja de andar, pedile a Claude que lo ajuste.
- Un mod que falla se saltea. La guardia tiene un `.catch` para que, si falla, frene en vez de dejar pasar.
- La guardia mira el texto de cada comando: evita accidentes, pero no frena a alguien que la quiera
  esquivar a propósito.
- `grabando` tapa lo que ves en pantalla, no lo que lee Claude: sirve para grabar o compartir pantalla,
  no es una protección de datos.
