import type { Register } from 'claude-code'

// .env and .env.<anything>, except .env.example (the template that is meant to be shared).
const ENV_FILE = /(^|\/)\.env(\.(?!example$)[\w.-]+)?$/
const ENV_IN_COMMAND = /(^|[\s'"=/])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s'";|&)])/
// rm with both -r and -f, in any order or spelling: -rf, -fr, -Rf, -r -f, --recursive --force.
const RM_RF = /\brm\b(?=[^;&|]*\s-(?:[a-zA-Z]*[rR][a-zA-Z]*|-recursive)\b)(?=[^;&|]*\s-(?:[a-zA-Z]*f[a-zA-Z]*|-force)\b)/

export const register: Register = on => {
  on('tool.call', { tool: ['Read', 'Edit', 'Write'] }, ($, e, next) =>
    ENV_FILE.test(e.file_path)
      ? { deny: `guardia: ${e.file_path} está protegido. Las claves no se leen ni se tocan desde Claude.` }
      : next(e),
  ).catch(($, e, next) =>
    next.called ? next(e) : { deny: 'guardia: la guardia falló, así que frena por las dudas.' },
  )

  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    if (RM_RF.test(e.command)) {
      return { deny: 'guardia: rm -rf está bloqueado. Si de verdad hay que borrar, hacelo vos a mano.' }
    }
    if (ENV_IN_COMMAND.test(e.command)) {
      return { deny: 'guardia: ese comando toca un archivo .env, y las claves no se leen desde Claude.' }
    }
    return next(e)
  }).catch(($, e, next) =>
    next.called ? next(e) : { deny: 'guardia: la guardia falló, así que frena por las dudas.' },
  )
}
