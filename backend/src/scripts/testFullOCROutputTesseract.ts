import { parseBoardingPassWithTesseract } from '../utils/boardingPassTesseract';
import { convertToLegacyFormat } from '../utils/boardingPassParserV2';
import { preprocessBoardingPassImage } from '../utils/imagePreprocessing';
import fs from 'fs';
import path from 'path';

async function testFullOutputWithTesseract() {
  const testImagesDir = path.join(__dirname, '../../../boarding-pass-tests-images');
  
  // Test different images
  const testImages = [
    'bestquality.png',
    'boardingpassmobilegoodquality.jpg'
  ];
  
  console.log('=== Testing Full OCR Output with City/Country Info (Tesseract) ===\n');
  
  for (const imageName of testImages) {
    const imagePath = path.join(testImagesDir, imageName);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`❌ Image not found: ${imagePath}`);
      continue;
    }
    
    console.log(`\n📄 Testing: ${imageName}`);
    console.log('─'.repeat(60));
    
    try {
      const buffer = fs.readFileSync(imagePath);
      
      // Preprocess if needed
      let processedBuffer = buffer;
      if (imageName.includes('mobile') || imageName.includes('jpg')) {
        processedBuffer = await preprocessBoardingPassImage(buffer, 'image/jpeg');
      }
      
      const tesseractResult = await parseBoardingPassWithTesseract(processedBuffer, 'image/png');
      
      if (tesseractResult) {
        // Convert to legacy format
        const legacyData = convertToLegacyFormat(tesseractResult);
        
        console.log('\n✅ OCR Success!\n');
        console.log('Flight Information:');
        console.log('─'.repeat(50));
        
        // Airline info
        console.log(`Airline: ${legacyData.airline || tesseractResult.flight.airline.name || 'Unknown'} (${tesseractResult.flight.airline.iataCode || 'XX'})`);
        console.log(`Flight Number: ${tesseractResult.flight.flightNumber || 'Unknown'}`);
        
        // Origin info
        console.log('\nOrigin:');
        console.log(`  Airport Code: ${legacyData.origin?.airportCode || 'Unknown'}`);
        console.log(`  City: ${legacyData.origin?.city || 'Unknown'}`);
        console.log(`  Country: ${legacyData.origin?.country || 'Unknown'}`);
        console.log(`  Airport Name: ${legacyData.origin?.name || 'Unknown'}`);
        
        // Destination info
        console.log('\nDestination:');
        console.log(`  Airport Code: ${legacyData.destination?.airportCode || 'Unknown'}`);
        console.log(`  City: ${legacyData.destination?.city || 'Unknown'}`);
        console.log(`  Country: ${legacyData.destination?.country || 'Unknown'}`);
        console.log(`  Airport Name: ${legacyData.destination?.name || 'Unknown'}`);
        
        // Additional info
        console.log('\nAdditional Details:');
        console.log(`  Date: ${legacyData.flightDate || 'Unknown'}`);
        console.log(`  Departure Time: ${legacyData.scheduledDepartureTime || 'Unknown'}`);
        console.log(`  Arrival Time: ${legacyData.scheduledArrivalTime || 'Unknown'}`);
        console.log(`  Gate: ${tesseractResult.boardingInfo.gate || 'TBD'}`);
        console.log(`  Seat: ${tesseractResult.boardingInfo.seatNumber || 'Unknown'}`);
        console.log(`  Distance: ${legacyData.distance ? legacyData.distance + ' km' : 'Unknown'}`);
        
        // Show how it would appear in the UI
        console.log('\n\n📱 UI Display Format:');
        console.log('─'.repeat(50));
        console.log(`${legacyData.airline || 'Unknown Airline'}`);
        console.log(`${tesseractResult.flight.flightNumber}`);
        console.log(`${new Date(legacyData.flightDate || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
        console.log('');
        console.log(`${legacyData.origin?.airportCode || 'XXX'}`);
        console.log(`${legacyData.origin?.city || 'Unknown City'}, ${legacyData.origin?.country || ''}`);
        console.log(`${new Date(legacyData.scheduledDepartureTime || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`);
        console.log('');
        console.log(`${legacyData.destination?.airportCode || 'XXX'}`);
        console.log(`${legacyData.destination?.city || 'Unknown City'}, ${legacyData.destination?.country || ''}`);
        console.log(`${new Date(legacyData.scheduledArrivalTime || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`);
        console.log('');
        console.log(`Gate: ${tesseractResult.boardingInfo.gate || 'TBD'}`);
        console.log(`Seat: ${tesseractResult.boardingInfo.seatNumber || 'UNKNOWN'}`);
        console.log(`Points: ${Math.round((legacyData.distance || 0) * 0.1)}`);
        
      } else {
        console.log('❌ OCR Failed');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

testFullOutputWithTesseract().catch(console.error);