import { parseBoardingPassWithTesseract } from '../utils/boardingPassTesseract';
import { convertToLegacyFormat } from '../utils/boardingPassParserV2';
import { preprocessBoardingPassImage } from '../utils/imagePreprocessing';
import fs from 'fs';
import path from 'path';

async function demoDisplay() {
  const testImagesDir = path.join(__dirname, '../../../boarding-pass-tests-images');
  const imagePath = path.join(testImagesDir, 'boardingpassmobilegoodquality.jpg');
  
  if (!fs.existsSync(imagePath)) {
    console.log(`❌ Image not found: ${imagePath}`);
    return;
  }
  
  console.log('=== BOARDING PASS OCR DEMO ===\n');
  
  try {
    const buffer = fs.readFileSync(imagePath);
    const processedBuffer = await preprocessBoardingPassImage(buffer, 'image/jpeg');
    const tesseractResult = await parseBoardingPassWithTesseract(processedBuffer, 'image/png');
    
    if (tesseractResult) {
      const data = convertToLegacyFormat(tesseractResult);
      
      // Display as it would appear in the UI
      console.log('╔══════════════════════════════════════╗');
      console.log('║        BOARDING PASS DETAILS         ║');
      console.log('╠══════════════════════════════════════╣');
      console.log('║');
      console.log(`║  ${data.airline || 'Unknown Airline'}`);
      console.log(`║  Flight ${tesseractResult.flight.flightNumber}`);
      console.log(`║  ${new Date(data.flightDate || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
      console.log('║');
      console.log('║  ┌─────────────────────────────────┐');
      console.log(`║  │ ${data.origin?.airportCode || 'XXX'}                             │`);
      console.log(`║  │ ${(data.origin?.city || 'Unknown').padEnd(29)} │`);
      console.log(`║  │ ${(data.origin?.country || '').padEnd(29)} │`);
      console.log(`║  │ ${new Date(data.scheduledDepartureTime || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).padEnd(29)} │`);
      console.log('║  └─────────────────────────────────┘');
      console.log('║');
      console.log('║           ✈️ FLIGHT PATH ✈️');
      console.log('║');
      console.log('║  ┌─────────────────────────────────┐');
      console.log(`║  │ ${data.destination?.airportCode || 'XXX'}                             │`);
      console.log(`║  │ ${(data.destination?.city || 'Unknown').padEnd(29)} │`);
      console.log(`║  │ ${(data.destination?.country || '').padEnd(29)} │`);
      console.log(`║  │ ${new Date(data.scheduledArrivalTime || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).padEnd(29)} │`);
      console.log('║  └─────────────────────────────────┘');
      console.log('║');
      console.log(`║  Gate: ${tesseractResult.boardingInfo.gate || 'TBD'}`);
      console.log(`║  Seat: ${tesseractResult.boardingInfo.seatNumber || 'UNKNOWN'}`);
      console.log(`║  Points: ${Math.round((data.distance || 500) * 0.1)}`);
      console.log('║');
      console.log('╚══════════════════════════════════════╝');
      
      // Show what it would look like in the frontend
      console.log('\n\n📱 Mobile App Display:');
      console.log('─'.repeat(40));
      console.log(`${data.airline || 'Unknown Airline'}`);
      console.log(`${tesseractResult.flight.flightNumber}`);
      console.log(`${new Date(data.flightDate || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
      console.log('');
      console.log(`${data.origin?.airportCode || 'XXX'}`);
      console.log(`${data.origin?.city || 'Unknown'}, ${data.origin?.country || ''}`);
      console.log(`${new Date(data.scheduledDepartureTime || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`);
      console.log('');
      console.log(`${data.destination?.airportCode || 'XXX'}`);
      console.log(`${data.destination?.city || 'Unknown'}, ${data.destination?.country || ''}`);
      console.log(`${new Date(data.scheduledArrivalTime || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`);
      console.log('');
      console.log(`Gate: ${tesseractResult.boardingInfo.gate || 'TBD'}`);
      console.log(`Seat: ${tesseractResult.boardingInfo.seatNumber || 'UNKNOWN'}`);
      console.log(`Points: ${Math.round((data.distance || 500) * 0.1)}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

demoDisplay().catch(console.error);