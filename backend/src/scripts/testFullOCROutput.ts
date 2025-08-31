import { parseBoardingPassWithSimpletexV3 } from '../utils/boardingPassSimpletexV3';
import fs from 'fs';
import path from 'path';

// Configure environment
process.env.SIMPLETEX_API_KEY = '68sybsS7o4xDAfO0K2krSKfIYZcYkYycRNiPIdQmsmcoSfGSOQgq3LwZOQrJ8Ld4';

async function testFullOutput() {
  const testImagesDir = path.join(__dirname, '../../../boarding-pass-tests-images');
  const imagePath = path.join(testImagesDir, 'boardingpassmobilegoodquality.jpg');
  
  if (!fs.existsSync(imagePath)) {
    console.log(`❌ Image not found: ${imagePath}`);
    return;
  }
  
  console.log('=== Testing Full OCR Output with City/Country Info ===\n');
  
  try {
    const buffer = fs.readFileSync(imagePath);
    const result = await parseBoardingPassWithSimpletexV3(buffer, 'image/jpeg');
    
    if (result.success && result.data) {
      console.log('✅ OCR Success!\n');
      console.log('Flight Information:');
      console.log('─'.repeat(50));
      
      // Airline info
      console.log(`Airline: ${result.data.airline || 'Unknown'} (${result.data.airlineCode || 'XX'})`);
      console.log(`Flight Number: ${result.data.flightNumber || 'Unknown'}`);
      
      // Origin info
      console.log('\nOrigin:');
      console.log(`  Airport Code: ${result.data.origin?.airportCode || 'Unknown'}`);
      console.log(`  City: ${result.data.origin?.city || 'Unknown'}`);
      console.log(`  Country: ${result.data.origin?.country || 'Unknown'}`);
      console.log(`  Airport Name: ${result.data.origin?.name || 'Unknown'}`);
      
      // Destination info
      console.log('\nDestination:');
      console.log(`  Airport Code: ${result.data.destination?.airportCode || 'Unknown'}`);
      console.log(`  City: ${result.data.destination?.city || 'Unknown'}`);
      console.log(`  Country: ${result.data.destination?.country || 'Unknown'}`);
      console.log(`  Airport Name: ${result.data.destination?.name || 'Unknown'}`);
      
      // Additional info
      console.log('\nAdditional Details:');
      console.log(`  Date: ${result.data.flightDate || 'Unknown'}`);
      console.log(`  Departure Time: ${result.data.scheduledDepartureTime || 'Unknown'}`);
      console.log(`  Arrival Time: ${result.data.scheduledArrivalTime || 'Unknown'}`);
      console.log(`  Gate: ${result.data.gate || result.data.origin?.gate || 'TBD'}`);
      console.log(`  Seat: ${result.data.seat || result.data.seatNumber || 'Unknown'}`);
      console.log(`  Distance: ${result.data.distance ? result.data.distance + ' km' : 'Unknown'}`);
      
      // Raw JSON output
      console.log('\n\nRaw JSON Output:');
      console.log('─'.repeat(50));
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ OCR Failed');
      if (result.errors) {
        console.log('\nErrors:', result.errors);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testFullOutput().catch(console.error);