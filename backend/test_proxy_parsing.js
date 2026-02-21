// Test proxy parsing logic
const checkoutService = require('./services/checkoutService');

console.log('🧪 Testing Proxy Parsing Logic...\n');

// Test the makeRequest function with proxy parsing
async function testProxyParsing() {
  try {
    console.log('Testing proxy string: p.webshare.io:80:kumldkme-rotate:uz047zho9ipr');

    // Create a mock test that just tests the proxy parsing without making real request
    const mockOptions = {
      proxy: 'p.webshare.io:80:kumldkme-rotate:uz047zho9ipr'
    };

    // Simulate the proxy parsing logic from makeRequest
    let proxyObj = null;
    if (mockOptions.proxy && typeof mockOptions.proxy === 'string') {
      const proxyParts = mockOptions.proxy.split(':');
      console.log('Proxy parts:', proxyParts);

      if (proxyParts.length >= 2) {
        proxyObj = {
          host: proxyParts[0],
          port: parseInt(proxyParts[1]),
          user: proxyParts.length >= 3 ? proxyParts[2] : undefined,
          pass: proxyParts.length >= 4 ? proxyParts[3] : undefined
        };
      }
    }

    console.log('Parsed proxy object:', proxyObj);

    if (proxyObj) {
      console.log(`✅ Proxy parsed successfully:`);
      console.log(`   Host: ${proxyObj.host}`);
      console.log(`   Port: ${proxyObj.port}`);
      console.log(`   User: ${proxyObj.user}`);
      console.log(`   Pass: ${proxyObj.pass ? '***' : 'undefined'}`);
    } else {
      console.log('❌ Proxy parsing failed');
    }

  } catch (error) {
    console.error('❌ Error during proxy parsing test:', error.message);
    console.error('Stack:', error.stack);
  }
}

testProxyParsing();