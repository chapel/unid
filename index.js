var netif = require('netif')

var def = {}
def.time = {
    s: 0
  , e: 8
}
def.seq = {
    s: 8
  , e: 10
}
def.mac = {
    s: 10
  , e: 16
}

function randomMac() {
  var mac = ''

  for (var i = 0; i < 12; i+=1) {
    if (i !== 0 && !(i % 2)) mac += ':'
    mac += Math.floor(Math.random() * 16).toString(16)
  }

  return mac
}

function padLeft(str, length) {
  for (var i = str.length; i < length; i+=1) {
    str = '0' + str
  }
  return str
}

function getMacBuffer(mac) {
  var macBuf = new Buffer(6)
    , mac = mac.split(':')
    , tmp

  for (var i = 0; i < 6; i+=1) {
    tmp = parseInt(mac[i], 16)
    macBuf.writeUInt8(tmp, i)
  }
  return macBuf
}

function con(opts) {
  opts = opts || {}

  var lastTimestamp = 0
    , sequence = 0
    , maxSequence = 32 * 1024 - 1
    , macRegex = /^(?:[a-f0-9]{1,2}[:\-]){5}[a-f0-9]{1,2}$/i
    , hexRegex = /^[0-9a-fA-F]{27}$/
    , validMac = macRegex.test(opts.mac)
    , mac = opts.mac && validMac ? opts.mac : randomMac()

  if (opts.mac && !validMac) throw new Error(opts.mac + ' is not a valid mac address')

  if (opts.interface) mac = netif.getMacAddress(opts.interface)

  mac = getMacBuffer(mac)

  function Unid(id) {
    if (!(this instanceof Unid)) return new Unid(id)

    if (id) {
      if (!Buffer.isBuffer(id) || typeof id === 'string') {
        id = Unid.createFromHexString(id)
      }
    } else {
      id = Unid.generate()
    }

    this._id = id
  }

  Unid.generate = function () {
    var now = Date.now()
      , max = lastTimestamp


    if (now < max) {
      console.error('WARNING: Your time has drifted backwards!')
    }

    if (now === max) {
      sequence += 1
      if (sequence > maxSequence) {
        sequence = 0
      }
    } else {
      sequence = 0
    }

    if (now > max) {
      lastTimestamp = now
    }

    var id = new Buffer(16)

    id.writeDoubleBE(now, def.time.s)

    id.writeInt16BE(sequence, def.seq.s)

    mac.copy(id, def.mac.s, 0)

    return id
  }

  Unid.createFromHexString = function (hexStr) {
    var id = new Buffer(16)
      , tmpStr = ''
      , tmpNum = 0

    // Timestamp
    tmpStr = hexStr.slice(0, 11)
    tmpNum = parseInt(tmpStr, 16)
    id.writeDoubleBE(tmpNum, def.time.s)

    // Sequence
    tmpStr = hexStr.slice(11, 15)
    tmpNum = parseInt(tmpStr, 16)
    id.writeInt16BE(tmpNum, def.seq.s)

    // Mac address
    tmpStr = hexStr.slice(15)
    for (var i = 0; i < 6; i+=1) {
      tmpNum = parseInt(tmpStr.slice(i * 2, (i * 2) + 2), 16)
      id.writeUInt8(tmpNum, i + def.mac.s)
    }

    return id
  }

  Unid.prototype.getNumber = function (section) {
    var bin
    
    if (section === 'timestamp') {
      bin = this._id.readDoubleBE(0, 8)
    }

    if (section === 'sequence') {
      bin = this._id.readInt16BE(8)
    }

    return bin
  }

  Unid.prototype.getHex = function (section) {
    var hex = ''
    
    if (section === 'timestamp') {
      hex = this.getNumber(section).toString(16)
    }

    if (section === 'sequence') {
      hex = this.getNumber(section).toString(16)
      if (hex.length < 4) hex = padLeft(hex, 4)
    }

    if (section === 'mac') {
      var tmp = ''
      for (var i = 0; i < 6; i+=1) {
        tmp = this._id.readUInt8(10 + i).toString(16)
        if (tmp.length < 4) tmp = padLeft(tmp, 2)
        hex += tmp
      }
    }

    return hex
  }

  Unid.prototype.toHexString = function () {
    if (this._hexStr) return this._hexStr
    var str = ''

    str += this.getHex('timestamp')
    str += this.getHex('sequence')
    str += this.getHex('mac')

    return this._hexStr = str
  }

  Unid.prototype.toString = function () {
    return this.toHexString()
  }

  Unid.prototype.toJSON = function () {
    return this.toHexString()
  }

  Unid.prototype.inspect = Unid.prototype.toString

  Unid.prototype.equals = function (otherId) {
    var id = otherId instanceof Unid ? otherId.toString() : (new Unid(otherId)).toString()

    return this.toString() === id
  }

  Unid.prototype.getSequence = function () {
    return this.getNumber('sequence')
  }

  Unid.prototype.getTimestamp = function () {
    return new Date(this.getNumber('timestamp'))
  }

  return Unid
}

con.randomMac = randomMac
con.padLeft = padLeft
con.getMacBuffer = getMacBuffer

module.exports = con
