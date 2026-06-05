/**
 * Unit Tests for dashboard.js security and utility functions
 * 
 * To run these tests:
 * 1. Option A: Use Node.js with a test runner (Jest, Mocha, etc.)
 *    npm install --save-dev jest
 *    npm test
 * 
 * 2. Option B: Run in browser console after dashboard.js loads
 *    Copy/paste test functions and run individually
 */

// ── TESTS: escapeHtml() ───────────────────────────────────
function testEscapeHtml() {
  console.group('Testing escapeHtml()');
  
  const tests = [
    {
      input: '<script>alert("XSS")</script>',
      expected: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
      description: 'Escapes script tags and quotes'
    },
    {
      input: 'John & Jane',
      expected: 'John &amp; Jane',
      description: 'Escapes ampersands'
    },
    {
      input: '<img src=x onerror="alert(1)">',
      expected: '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
      description: 'Escapes HTML injection attempts'
    },
    {
      input: "It's working",
      expected: 'It&#039;s working',
      description: 'Escapes single quotes'
    },
    {
      input: 'Normal text without special chars',
      expected: 'Normal text without special chars',
      description: 'Leaves normal text unchanged'
    },
    {
      input: '',
      expected: '',
      description: 'Handles empty strings'
    },
    {
      input: null,
      expected: '',
      description: 'Handles null input'
    },
    {
      input: undefined,
      expected: '',
      description: 'Handles undefined input'
    },
    {
      input: 123,
      expected: '',
      description: 'Handles non-string input'
    }
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach((test, i) => {
    const result = escapeHtml(test.input);
    const isPass = result === test.expected;
    
    if (isPass) {
      console.log(`✅ Test ${i + 1}: ${test.description}`);
      passed++;
    } else {
      console.error(`❌ Test ${i + 1}: ${test.description}`);
      console.error(`   Input: ${JSON.stringify(test.input)}`);
      console.error(`   Expected: ${test.expected}`);
      console.error(`   Got: ${result}`);
      failed++;
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  console.groupEnd();
  
  return { passed, failed };
}

// ── TESTS: getVehicleStatus() ─────────────────────────────
function testGetVehicleStatus() {
  console.group('Testing getVehicleStatus()');

  const now = Date.now();
  const tests = [
    {
      vehicle: { ts: null },
      expected: 'offline',
      description: 'Returns offline when no timestamp'
    },
    {
      vehicle: { ts: new Date(now - 10 * 60 * 1000).toISOString(), speed: 0 }, // 10 min ago
      expected: 'idle',
      description: 'Returns idle when recent but not moving'
    },
    {
      vehicle: { ts: new Date(now - 2 * 60 * 1000).toISOString(), speed: 20 }, // 2 min ago, moving
      expected: 'online',
      description: 'Returns online when recent and moving'
    },
    {
      vehicle: { ts: new Date(now - 20 * 60 * 1000).toISOString(), speed: 50 }, // 20 min ago (expired)
      expected: 'offline',
      description: 'Returns offline when data is stale (> 15 min)'
    },
    {
      vehicle: { ts: new Date(now - 5 * 1000).toISOString(), speed: 3 }, // 5 sec ago, moving slowly
      expected: 'idle',
      description: 'Returns idle when speed below threshold (5 km/h)'
    },
    {
      vehicle: { ts: new Date(now - 5 * 1000).toISOString(), speed: 5 }, // exactly at threshold
      expected: 'online',
      description: 'Returns online when speed equals threshold'
    }
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach((test, i) => {
    try {
      const result = getVehicleStatus(test.vehicle);
      const isPass = result === test.expected;
      
      if (isPass) {
        console.log(`✅ Test ${i + 1}: ${test.description}`);
        passed++;
      } else {
        console.error(`❌ Test ${i + 1}: ${test.description}`);
        console.error(`   Expected: ${test.expected}`);
        console.error(`   Got: ${result}`);
        failed++;
      }
    } catch (err) {
      console.error(`❌ Test ${i + 1}: ${test.description} - Error: ${err.message}`);
      failed++;
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  console.groupEnd();
  
  return { passed, failed };
}

// ── TESTS: validateUserInfo() ─────────────────────────────
function testValidateUserInfo() {
  console.group('Testing user info validation');

  const tests = [
    {
      input: { name: 'John Doe', email: 'john@example.com' },
      expected: true,
      description: 'Valid user info passes validation'
    },
    {
      input: { name: 'Jane', email: 'jane@test.com', extra: 'field' },
      expected: true,
      description: 'Valid user info with extra fields passes validation'
    },
    {
      input: { name: 'John' }, // missing email
      expected: false,
      description: 'Missing email fails validation'
    },
    {
      input: { email: 'test@test.com' }, // missing name
      expected: false,
      description: 'Missing name fails validation'
    },
    {
      input: null,
      expected: false,
      description: 'Null fails validation'
    },
    {
      input: undefined,
      expected: false,
      description: 'Undefined fails validation'
    },
    {
      input: 'not an object',
      expected: false,
      description: 'String fails validation'
    },
    {
      input: { name: '', email: 'test@test.com' }, // empty name
      expected: false,
      description: 'Empty name fails validation'
    }
  ];

  let passed = 0;
  let failed = 0;

  function validateUserInfo(userInfo) {
    return userInfo && typeof userInfo === 'object' && userInfo.name && userInfo.email;
  }

  tests.forEach((test, i) => {
    const result = validateUserInfo(test.input);
    const isPass = result === test.expected;
    
    if (isPass) {
      console.log(`✅ Test ${i + 1}: ${test.description}`);
      passed++;
    } else {
      console.error(`❌ Test ${i + 1}: ${test.description}`);
      console.error(`   Expected: ${test.expected}`);
      console.error(`   Got: ${result}`);
      failed++;
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  console.groupEnd();
  
  return { passed, failed };
}

// ── RUN ALL TESTS ────────────────────────────────────────
function runAllTests() {
  console.clear();
  console.log('='.repeat(60));
  console.log('Running Security & Utility Function Tests');
  console.log('='.repeat(60));
  console.log('');

  const escapeHtmlResults = testEscapeHtml();
  console.log('');
  
  const getVehicleStatusResults = testGetVehicleStatus();
  console.log('');
  
  const validateUserInfoResults = testValidateUserInfo();
  console.log('');

  const totalPassed = escapeHtmlResults.passed + getVehicleStatusResults.passed + validateUserInfoResults.passed;
  const totalFailed = escapeHtmlResults.failed + getVehicleStatusResults.failed + validateUserInfoResults.failed;

  console.log('='.repeat(60));
  console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
  console.log('='.repeat(60));

  return { totalPassed, totalFailed };
}

// Export for CommonJS/Node.js if available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testEscapeHtml,
    testGetVehicleStatus,
    testValidateUserInfo,
    runAllTests
  };
}
