// Test proxy with HTTP request to httpbin.org
const checkoutService = require('./services/checkoutService');

async function testProxyHttp() {
  console.log('🧪 Testing Proxy with HTTP Request...\n');

  // Test with httpbin.org to see if proxy works
  const testData = {
    test: 'proxy_check',
    timestamp: Date.now()
  };

  const proxy = 'p.webshare.io:80:kumldkme-rotate:uz047zho9ipr';

  try {
    console.log('📡 Making HTTP request through proxy to httpbin.org...');
    console.log('Proxy:', proxy);

    // Use the makeRequest method with proxy
    const result = await new Promise((resolve) => {
      const url = 'http://httpbin.org/post';
      const postData = new URLSearchParams(testData).toString();

      const parsedProxy = {
        host: 'p.webshare.io',
        port: 80,
        user: 'kumldkme-rotate',
        pass: 'uz047zho9ipr'
      };

      checkoutService.makeRequest(url, testData, { proxy: parsedProxy })
        .then(resolve)
        .catch(err => resolve({ error: { message: err.message } }));
    });

    console.log('\n📊 Result:');
    if (result.error) {
      console.log('❌ Error:', result.error.message);
    } else {
      console.log('✅ Success! Response received');
      console.log('URL:', result.url);
      console.log('Origin IP:', result.origin);
      console.log('Headers:', Object.keys(result.headers || {}).length, 'headers');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProxyHttp();