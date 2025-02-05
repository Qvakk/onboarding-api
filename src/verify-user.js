
const { FINT } = require('../config')
const { getFintPersonId } = require('./fint-client')
const { getUserByCustomSecurityAttributeFintId, getUserByCustomSecurityAttributeSsn } = require('./call-graph')
const { logger } = require('@vtfk/logger')

/**
 * Example verify user function that checks FINT first
 * @param {Object} logEntry
 * @returns {Promise<Object>} Updated logEntry
 */
async function verifyUser(logEntry) {
  // Assume we get SSN from logEntry.idPorten.pid
  const ssn = logEntry.idPorten.pid
  let user = null

  if (FINT.ENABLED) {
    try {
      const fintId = await getFintPersonId(ssn, logEntry.userType)
      if (fintId) {
        logEntry.fint = {
          id: fintId,
          result: { status: 'success', message: 'Found FINT ID' }
        }
        user = await getUserByCustomSecurityAttributeFintId(fintId)
      }
    } catch (error) {
      logger('error', ['verifyUser', 'Failed to retrieve FINT ID', error.message])
      logEntry.fint = {
        id: null,
        result: { status: 'error', message: error.message }
      }
    }
  }

  // Fallback to SSN if no user found via FINT
  if (!user?.id) {
    user = await getUserByCustomSecurityAttributeSsn(ssn)
    if (!user.id) {
      throw new Error('User not found by FINT or SSN')
    }
  }

  // Update log entry with user data
  logEntry.entraId.id = user.id
  logEntry.entraId.userPrincipalName = user.userPrincipalName
  logEntry.entraId.displayName = user.displayName
  logEntry.entraId.result = {
    status: 'success',
    message: 'Verified user successfully'
  }

  return logEntry
}

module.exports = { verifyUser }