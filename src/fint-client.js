const axios = require('axios')
const { FINT } = require('../config')
const { logger } = require('@vtfk/logger')
const NodeCache = require('node-cache')

const tokenCache = new NodeCache({ stdTTL: 3500 }) // Cache token for ~58 minutes
const CACHE_KEY = 'fint_access_token'

const getAccessToken = async () => {
  const cachedToken = tokenCache.get(CACHE_KEY)
  if (cachedToken) return cachedToken

  try {
    const params = new URLSearchParams()
    params.append('grant_type', 'password')
    params.append('username', FINT.CLIENT.USERNAME)
    params.append('password', FINT.CLIENT.PASSWORD)
    params.append('client_id', FINT.CLIENT.ID)
    params.append('client_secret', FINT.CLIENT.SECRET)
    params.append('scope', FINT.CLIENT.SCOPE)

    const { data } = await axios.post(FINT.CLIENT.IDP_URI, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    tokenCache.set(CACHE_KEY, data.access_token)
    return data.access_token
  } catch (error) {
    logger('error', ['getAccessToken', 'Failed to get FINT access token', error.message])
    throw error
  }
}

const getFintClient = async () => {
  const token = await getAccessToken()
  return axios.create({
    baseURL: FINT.BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'x-org-id': FINT.CLIENT.ASSET_ID,
      'x-client': 'onboarding-api'
    }
  })
}

/**
 * Get person ID from FINT based on SSN and user type
 * @param {string} ssn Social security number
 * @param {('elev'|'ansatt')} userType Type of user
 * @returns {Promise<object>} Object containing ElevId and AnsattId
 */
const getFintPersonId = async (ssn, userType) => {
  if (!FINT.ENABLED) return null

  try {
    const client = await getFintClient()
    const endpoint = userType === 'elev' ? FINT.ENDPOINTS.STUDENT : FINT.ENDPOINTS.EMPLOYEE
    const { data } = await client.get(`${endpoint}/${ssn}`)
    
    let elevId = null;
    let ansattId = null;

    if (userType === 'elev') {
      const elevLink = data._links?.elev?.[0]?.href
      if (elevLink) elevId = elevLink.split('/').pop()
    } else {
      const personLink = data._links?.personalressurs?.[0]?.href
      if (personLink) ansattId = personLink.split('/').pop()
    }

    return { elevId, ansattId };
  } catch (error) {
    logger('error', ['getFintPersonId', `Failed to get FINT ID for ${userType}`, error.message])
    throw error
  }
}

module.exports = { getFintPersonId }
