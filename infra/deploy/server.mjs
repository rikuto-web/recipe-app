import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import handler from './dist/server/server.js'

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '127.0.0.1'

function nodeRequestToWeb(req) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  return new Request(url, {
    method: req.method,
    headers: req.headers,
    duplex: 'half',
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req,
  })
}

async function webResponseToNode(webRes, res) {
  res.statusCode = webRes.status
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  if (!webRes.body) {
    res.end()
    return
  }
  Readable.fromWeb(webRes.body).pipe(res)
}

createServer(async (req, res) => {
  try {
    const webRes = await handler.fetch(await nodeRequestToWeb(req))
    await webResponseToNode(webRes, res)
  } catch (error) {
    console.error(error)
    res.statusCode = 500
    res.end('Internal Server Error')
  }
}).listen(port, host, () => {
  console.log(`frontend listening on http://${host}:${port}`)
})
