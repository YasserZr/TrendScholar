const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found');
  process.exit(1);
}

console.log('🔍 Fetching available Gemini models...\n');

try {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ Error:', data);
    process.exit(1);
  }
  
  console.log('✅ Available models:\n');
  
  if (data.models && Array.isArray(data.models)) {
    data.models.forEach(model => {
      console.log(`📦 ${model.name}`);
      console.log(`   Display Name: ${model.displayName}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ')}`);
      console.log('');
    });
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
