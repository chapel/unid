var assert = require('assert')
  , unid   = require('../index')
  , netif  = require('netif')

function macBufToStr(buf) {
  var mac = ''
    , tmp

  for (var i = 0; i < 6; i+=1) {
    tmp = buf.readUInt8(0 + i)
    if (tmp < 16) mac += '0'
    mac += tmp.toString(16)
    if (i !== 5) mac += ':'
  }

  return mac
}

describe('Unid', function () {
  it('randomMac() should create a somewhat valid mac address', function () {
    var regex = /^(?:[a-f0-9]{1,2}[:\-]){5}[a-f0-9]{1,2}$/i
    for (var i = 0; i < 1000; i+=1) {
      assert(regex.test(unid.randomMac()))
    }
  })

  it('padLeft() should create a string with given length padded with 0\'s', function () {
    assert.deepEqual(unid.padLeft('1', 4), '0001')
    assert.deepEqual(unid.padLeft('10', 5), '00010')
    assert.deepEqual(unid.padLeft('a', 10), '000000000a')
  })

  it('should return an instance of Unid if not called with new', function () {
    var Unid = unid()
      , id = Unid()

    assert(id instanceof Unid)
  })

  it('should create a full Unid when passed a proper hex string', function () {
    var Unid  = unid()
      , id    = new Unid()
      , hex   = id.toString()
      , hexId = new Unid(hex)

    assert(hexId instanceof Unid)
    assert.strictEqual(hexId.toString(), hex)
  })

  it('should use provided network interface for mac address', function () {
    var interface = process.platform === 'darwin' ? 'en0' : 'eth0'
      , iMac      = netif.getMacAddress(interface).toLowerCase()
      , Unid      = unid({interface: interface})
      , id        = new Unid()

    assert.strictEqual(macBufToStr(id._id.slice(10)), iMac)
  })

  it('should use mac address passed in options', function () {
    var mac  = '00:ff:ee:55:aa:af'
      , Unid = unid({mac: mac})
      , id   = new Unid()

    assert.strictEqual(macBufToStr(id._id.slice(10)), mac)
  })

  it('should retrieve timestamp', function () {
    var Unid = unid()
      , id   = new Unid()
      , timestamp = id._id.readDoubleBE(0, 8)

    assert.strictEqual(id.getTimestamp().valueOf(), timestamp)
  })

  it('should retrieve sequence', function () {
    var Unid = unid()
      , id   = new Unid()
      , sequence = id._id.readInt16BE(8, 10)

    assert.strictEqual(id.getSequence(), sequence)
  })
})
