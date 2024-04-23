const { getMsalToken } = require('./get-msal-token')
const { GRAPH } = require('../config')
const { default: axios } = require('axios')
const { logger } = require('@vtfk/logger')

const aninopel = 'hahaha, nørd'

const getUserBySsn = async (ssn) => {
  const accessToken = await getMsalToken({ scope: GRAPH.SCOPE })
  const url = `${GRAPH.URL}/v1.0/users/?$count=true&$select=id,displayName,customSecurityAttributes&$filter=customSecurityAttributes/IDM/SSN eq '${ssn}'`
  const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}`, ConsistencyLevel: 'eventual' } })
  console.log(data)
  if (data.value.length > 1) {
    throw new Error('Found more than one user on ssn, glitch in the matrix. Delete one of the clones.')
  }
  if (data.value.length === 0) {
    throw new Error('No users found on ssn, does person actually exist??')
  }
  return data.value[0]
}

const createTAP = async (userId) => {
  const accessToken = await getMsalToken({ scope: GRAPH.SCOPE })
  const url = `${GRAPH.URL}/v1.0/users/${userId}/authentication/temporaryAccessPassMethods`
  const tapBody = {
    lifetimeInMinutes: 480,
    isUsableOnce: false
  }
  const { data } = await axios.post(url, tapBody, { headers: { Authorization: `Bearer ${accessToken}` } })
  return data
}

const getTAP = async (userId) => {
  const accessToken = await getMsalToken({ scope: GRAPH.SCOPE })
  const url = `${GRAPH.URL}/v1.0/users/${userId}/authentication/temporaryAccessPassMethods`
  const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  return data
}

const deleteTAP = async (userId) => {
  const accessToken = await getMsalToken({ scope: GRAPH.SCOPE })
  const url = `${GRAPH.URL}/v1.0/users/${userId}/authentication/temporaryAccessPassMethods`
  const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (data.value && data.value.length > 0) {
    const url = `${GRAPH.URL}/v1.0/users/${userId}/authentication/temporaryAccessPassMethods/${data.value[0].id}`
    const { status } = await axios.delete(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    return status
  }
  return 204
}

const updatePassword = async (userId, password) => {
  const accessToken = await getMsalToken({ scope: GRAPH.SCOPE })
  const url = `${GRAPH.URL}/v1.0/users/${userId}`
  const passwordBody = {
    passwordProfile: {
      forceChangePasswordNextSignIn: false,
      password
    }
  }
  logger('info', ['Updating password', url])
  const { status } = await axios.patch(url, passwordBody, { headers: { Authorization: `Bearer ${accessToken}` } })
  return status
}

const callGraph = async (method, resource, body) => {
  const validMethods = ['get', 'post', 'patch']
  if (!validMethods.includes(method.toLowerCase())) throw new Error(`Method must be one of: ${validMethods.join(', ')}`)
  const accessToken = await getMsalToken({ scope: GRAPH.SCOPE })
  logger('info', ['Calling graph', method, `${GRAPH.URL}/${resource}`])
  if (body) {
    const { data } = await axios[method.toLowerCase()](`${GRAPH.URL}/${resource}`, body, { headers: { Authorization: `Bearer ${accessToken}` } })
    return data
  }
  const { data } = await axios[method.toLowerCase()](`${GRAPH.URL}/${resource}`, { headers: { Authorization: `Bearer ${accessToken}` } })
  return data
}

module.exports = { callGraph, getUserBySsn, createTAP, updatePassword, getTAP, deleteTAP }
