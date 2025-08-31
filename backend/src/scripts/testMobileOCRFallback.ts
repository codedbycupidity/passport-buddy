import { parseBoardingPassWithTesseract } from '../utils/boardingPassTesseract';
import { convertToLegacyFormat } from '../utils/boardingPassParserV2';
import { preprocessBoardingPassImage, adaptivePreprocess } from '../utils/imagePreprocessing';
import fs from 'fs';
import path from 'path';

async function testMobileImagesWithFallback() {
  const testImagesDir = path.join(__dirname, '../../../boarding-pass-tests-images');
  
  // Mobile test images
  const mobileImages = [
    'boardingpassmobilegoodquality.jpg',
    'boardingpassmobilezoomedout.jpg'
  ];
  
  console.log('=== Testing Mobile Boarding Pass OCR with Tesseract Fallback ===\n');
  
  for (const imageName of mobileImages) {
    const imagePath = path.join(testImagesDir, imageName);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`❌ Image not found: ${imagePath}`);
      continue;
    }
    
    console.log(`\n📱 Testing: ${imageName}`);
    console.log('─'.repeat(50));
    
    try {
      const buffer = fs.readFileSync(imagePath);
      
      // Apply preprocessing
      console.log('Applying adaptive preprocessing...');
      const enhancedBuffer = await adaptivePreprocess(buffer);
      
      // Try Tesseract OCR
      console.log('Running Tesseract OCR...');
      const tesseractResult = await parseBoardingPassWithTesseract(enhancedBuffer, 'image/png');
      
      if (tesseractResult) {
        console.log('✅ Tesseract OCR Success!');
        
        // Convert to legacy format for display
        const legacyData = convertToLegacyFormat(tesseractResult);
        
        console.log('\nExtracted Data:');
        console.log(`  Flight: ${tesseractResult.flight.flightNumber || 'Not found'}`);
        console.log(`  Route: ${tesseractResult.flight.departure.airportCode} → ${tesseractResult.flight.arrival.airportCode}`);
        console.log(`  Passenger: ${tesseractResult.passenger.name.raw || 'Not found'}`);
        console.log(`  Date: ${tesseractResult.flight.departure.scheduledTime || 'Not found'}`);
        console.log(`  Gate: ${tesseractResult.boardingInfo.gate || 'Not found'}`);
        console.log(`  Seat: ${tesseractResult.boardingInfo.seatNumber || 'Not found'}`);
        
        if (tesseractResult.scanMetadata.confidence) {
          console.log(`\n  OCR Confidence: ${(tesseractResult.scanMetadata.confidence.overall * 100).toFixed(1)}%`);
        }
      } else {
        console.log('❌ Tesseract OCR Failed');
        
        // Try standard preprocessing instead
        console.log('\nTrying standard preprocessing...');
        const standardBuffer = await preprocessBoardingPassImage(buffer, 'image/jpeg');
        const retryResult = await parseBoardingPassWithTesseract(standardBuffer, 'image/png');
        
        if (retryResult) {
          console.log('✅ OCR succeeded with standard preprocessing');
          console.log(`  Flight: ${retryResult.flight.flightNumber}`);
          console.log(`  Route: ${retryResult.flight.departure.airportCode} → ${retryResult.flight.arrival.airportCode}`);
        } else {
          console.log('❌ OCR failed with both preprocessing methods');
        }
      }
    } catch (error) {
      console.error('❌ Error processing image:', error);
    }
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testMobileImagesWithFallback().catch(console.error);