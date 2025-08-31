import { safeStrictDateExtraction } from './dateStrict';
import axios from 'axios';
import FormData from 'form-data';
import { validateBoardingPass } from './boardingPassValidator';
import { strictDateExtraction, estimateArrivalTime, safeParseTime, getAirlineTimeOrder } from './strictTimeHandling';
import { BoardingPassError } from '../errors/BoardingPassError';
import { 
  validateAirportCode, 
  validateFlightNumber, 
  validateFullFlight,
  getAirportInfo,
  calculateDistance,
  validateAirlineCode,
  detectAirlineFromText
} from '../services/airportValidation.service';
import { preprocessBoardingPassImage, isMobilePhoto } from './imagePreprocessing';

// SimpleTex API configuration
const SIMPLETEX_API_URL = 'https://server.simpletex.net/api/latex_ocr';
const SIMPLETEX_API_KEY = process.env.SIMPLETEX_API_KEY || '';

interface SimpletexResponse {
  status: boolean;
  res: {
    latex: string;
    conf: number;
  };
  error?: string;
  request_id?: string;
}

interface ParseResult {
  success: boolean;
  data?: any;
  errors?: Array<{
    field: string;
    code: string;
    message: string;
    suggestion: string;
  }>;
  requiresManualEntry?: string[];
}

export async function parseBoardingPassWithSimpletexV3(buffer: Buffer, mimeType: string): Promise<ParseResult> {
  try {
    console.log('Using SimpleTex OCR API V3 with strict time handling...');
    console.log('SimpleTex API Key present:', !!SIMPLETEX_API_KEY);
    console.log('SimpleTex API URL:', SIMPLETEX_API_URL);

    // Check if this might be a mobile photo and preprocess if needed
    const isMobile = await isMobilePhoto(buffer);
    console.log('Is mobile photo:', isMobile);
    
    let processedBuffer = buffer;
    let processedMimeType = mimeType;
    
    if (isMobile || mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      console.log('Preprocessing image for better OCR results...');
      processedBuffer = await preprocessBoardingPassImage(buffer, mimeType, {
        enhance: true,
        rotate: true,
        targetDpi: 300
      });
      processedMimeType = 'image/png'; // preprocessor outputs PNG
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', processedBuffer, {
      filename: 'boarding_pass.png',
      contentType: processedMimeType,
    });

    // Make request to SimpleTex
    const response = await axios.post(SIMPLETEX_API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        token: SIMPLETEX_API_KEY,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log('SimpleTex Response Status:', response.status);
    console.log('SimpleTex Response Data:', JSON.stringify(response.data, null, 2));
    
    const data: SimpletexResponse = response.data;

    if (data.status === true && data.res && data.res.latex) {
      console.log('SimpleTex OCR Result:', data.res.latex);
      console.log('SimpleTex Confidence:', data.res.conf);

      // Check confidence level
      if (data.res.conf < 0.3) {
        console.warn('Low OCR confidence:', data.res.conf, '- image may be poor quality');
      }

      // First use validation layer
      const validation = validateBoardingPass({
        text: data.res.latex,
        confidence: [{
          word: data.res.latex,
          confidence: data.res.conf
        }],
      });

      // Parse with strict handling, passing confidence for smarter decisions
      const parseResult = parseWithStrictHandling(data.res.latex, validation);
      
      // Add OCR confidence to metadata
      if (parseResult.data && parseResult.data.extractionMetadata) {
        parseResult.data.extractionMetadata.ocrConfidence = data.res.conf;
      }
      
      return parseResult;
    } else if (data.status === true && data.res && !data.res.latex) {
      console.error('SimpleTex returned empty OCR result - confidence:', data.res.conf);
      
      // Try fallback to Tesseract with enhanced preprocessing
      console.log('Attempting Tesseract OCR with enhanced preprocessing as fallback...');
      
      try {
        // Import Tesseract parser dynamically to avoid circular dependencies
        const { parseBoardingPassWithTesseract } = await import('./boardingPassTesseract');
        const { convertToLegacyFormat } = await import('./boardingPassParserV2');
        
        // Use adaptive preprocessing for better results
        const { adaptivePreprocess } = await import('./imagePreprocessing');
        const enhancedBuffer = await adaptivePreprocess(buffer);
        
        const tesseractResult = await parseBoardingPassWithTesseract(enhancedBuffer, 'image/png');
        
        if (tesseractResult) {
          console.log('Tesseract fallback succeeded');
          // Convert to legacy format and extract text for re-parsing
          const legacyData = convertToLegacyFormat(tesseractResult);
          
          // Reconstruct text from Tesseract result for validation
          const reconstructedText = `
            ${tesseractResult.passenger.name.raw}
            ${tesseractResult.flight.airline.name || tesseractResult.flight.airline.iataCode}
            FLIGHT ${tesseractResult.flight.flightNumber}
            ${tesseractResult.flight.departure.airportCode} → ${tesseractResult.flight.arrival.airportCode}
            GATE ${tesseractResult.boardingInfo.gate || ''}
            SEAT ${tesseractResult.boardingInfo.seatNumber || ''}
          `.toUpperCase();
          
          // Use the same validation and parsing logic
          const validation = validateBoardingPass({
            text: reconstructedText,
            confidence: [{
              word: reconstructedText,
              confidence: tesseractResult.scanMetadata.confidence?.overall || 0.7
            }],
          });
          
          // Return the converted legacy format
          return {
            success: true,
            data: legacyData
          };
        }
      } catch (fallbackError) {
        console.error('Tesseract fallback failed:', fallbackError);
      }
      
      // If all fallbacks fail, return error
      let suggestion = 'Please ensure the image contains a clear boarding pass';
      if (data.res.conf > 0.8) {
        suggestion = 'The image appears clear but no text was detected. Ensure the boarding pass is fully visible and not rotated.';
      } else if (data.res.conf < 0.5) {
        suggestion = 'Image quality is too low. Please take a clearer photo with better lighting.';
      }
      
      return {
        success: false,
        errors: [
          {
            field: 'ocr',
            code: 'EMPTY_OCR_RESULT',
            message: 'OCR could not extract text from the image',
            suggestion: suggestion,
          },
        ],
      };
    } else {
      console.error('SimpleTex OCR failed:', data.error || 'No result text');
      console.error('Full response:', JSON.stringify(data, null, 2));
      return {
        success: false,
        errors: [
          {
            field: 'ocr',
            code: 'OCR_FAILED',
            message: data.error || 'OCR processing failed',
            suggestion: 'Please try again with better lighting or enter manually',
          },
        ],
      };
    }
  } catch (error: any) {
    console.error('SimpleTex API Error:', error);
    console.error('Error details:', error.response?.data || error.message);
    return {
      success: false,
      errors: [
        {
          field: 'api',
          code: 'API_ERROR',
          message: error.response?.data?.error || 'Failed to connect to OCR service',
          suggestion: 'Please check your connection and try again',
        },
      ],
    };
  }
}

function parseLatexTable(latexText: string): Record<string, string> {
  const extracted: Record<string, string> = {};
  
  // Extract all text content from LaTeX, removing formatting
  const textPattern = /\\text\{([^}]+)\}/g;
  const texts: string[] = [];
  let match;
  
  while ((match = textPattern.exec(latexText)) !== null) {
    texts.push(match[1]);
  }
  
  console.log('Extracted texts from LaTeX:', texts);
  
  // Also extract cells from aligned or tabular format
  const cells: string[] = [];
  if (latexText.includes('\\hline')) {
    // Extract cell values from LaTeX table
    const cellPattern = /\\hline\s*(.*?)\s*(?=\\hline|$)/gs;
    while ((match = cellPattern.exec(latexText)) !== null) {
      const row = match[1];
      // Split by & and clean up
      const rowCells = row.split('&').map(cell => 
        cell.replace(/\\begin{tabular}.*?}|\\end{tabular}|\\\\|[{}]/g, '')
          .replace(/\$\\rightarrow\$/g, '→')
          .trim()
      );
      cells.push(...rowCells.filter(cell => cell.length > 0));
    }
  } else {
    // For aligned format, just use the extracted texts
    cells.push(...texts);
  }
  
  // Extract key information from cells
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const nextCell = cells[i + 1] || '';
    
    // Flight number - handle patterns like D3048 or DL3048
    if (cell === 'FLIGHT' && nextCell.match(/^[A-Z]+\d+/)) {
      extracted.flightNumber = nextCell;
    } else if (cell === 'FLOHT' && nextCell.match(/^[A-Z]+\d+/)) {
      // Handle OCR error "FLOHT" instead of "FLIGHT"
      extracted.flightNumber = nextCell;
    } else if (cell.match(/^[A-Z]+\d{3,4}$/)) {
      // Check if it looks like a flight number (1-2 letters followed by 3-4 digits)
      const flightMatch = cell.match(/^([A-Z]{1,2})(\d{3,4})$/);
      if (flightMatch) {
        // If single letter, try to expand to known airline code
        let flightNum = cell;
        if (flightMatch[1].length === 1) {
          // D -> DL (Delta), U -> UA (United), etc.
          const singleLetterMap: Record<string, string> = {
            'D': 'DL', // Delta
            'U': 'UA', // United
            'A': 'AA', // American
            'S': 'WN', // Southwest
            'B': 'B6', // JetBlue
          };
          const expanded = singleLetterMap[flightMatch[1]];
          if (expanded) {
            flightNum = expanded + flightMatch[2];
          }
        }
        extracted.flightNumber = extracted.flightNumber || flightNum;
      }
    }
    
    // Gate - look for pattern like "32A" after GATE
    if (cell === 'GATE') {
      // Look ahead for gate number (might not be immediately next)
      for (let j = i + 1; j < Math.min(i + 5, cells.length); j++) {
        if (cells[j].match(/^\d+[A-Z]?$/)) {
          extracted.gate = cells[j];
          break;
        }
      }
    }
    
    // Seat - look for pattern like "25B" after SEAT keyword
    if (cell === 'SEAT') {
      // Look for seat pattern in next few cells
      for (let j = i + 1; j < Math.min(i + 5, cells.length); j++) {
        if (cells[j].match(/^\d{1,3}[A-Z]$/)) {
          extracted.seat = cells[j];
          break;
        }
      }
    }
    
    // Zone - single letter or number
    if (cell === 'ZONE' && i + 1 < cells.length) {
      // Look for single character zone
      for (let j = i + 1; j < Math.min(i + 5, cells.length); j++) {
        if (cells[j].match(/^[A-Z0-9]$/)) {
          extracted.zone = cells[j];
          break;
        }
      }
    }
    
    // Times - handle various OCR errors in TIME keywords
    if ((cell.includes('BOARDING') && cell.includes('TIME')) || cell === 'BOARDINGTME') {
      // Look for time pattern in next few cells
      for (let j = i + 1; j < Math.min(i + 3, cells.length); j++) {
        if (cells[j].match(/\d{1,2}:\d{2}(AM|PM)?/i)) {
          extracted.boardingTime = cells[j];
          break;
        }
      }
    }
    
    if ((cell.includes('DEPARTURE') && cell.includes('TIME')) || cell === 'DEPARTURETME') {
      // Look for time pattern in next few cells
      for (let j = i + 1; j < Math.min(i + 3, cells.length); j++) {
        if (cells[j].match(/\d{1,2}:\d{2}(AM|PM)?/i)) {
          extracted.departureTime = cells[j];
          break;
        }
      }
    }
    
    // Airport codes (e.g., "JFK → SFO")
    if (cell.includes('→')) {
      const [origin, destination] = cell.split('→').map(s => s.trim());
      if (origin.match(/^[A-Z]{3}$/) && destination.match(/^[A-Z]{3}$/)) {
        extracted.origin = origin;
        extracted.destination = destination;
      }
    }
    
    // Also check for standalone 3-letter airport codes
    if (cell.match(/^[A-Z]{3}$/)) {
      const validation = validateAirportCode(cell);
      if (validation.isValid || validation.corrected) {
        const airportCode = validation.corrected || cell;
        
        // Check if previous or next cell might indicate if it's origin or destination
        const prevCell = cells[i - 1] || '';
        const nextCellIdx = i + 1;
        
        // Try to determine if it's origin or destination based on position
        // Usually origin comes before destination
        if (!extracted.origin) {
          extracted.origin = airportCode;
        } else if (!extracted.destination && airportCode !== extracted.origin) {
          extracted.destination = airportCode;
        }
      }
    }
    
    // Date (e.g., "OCTOBER 9, 2013" or "OCTOBER?2013")
    const monthMatch = cell.match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)[\s\?]*(\d{1,2})?[,，\s]*(\d{4})\b/);
    if (monthMatch) {
      const month = monthMatch[1];
      const day = monthMatch[2] || '1'; // Default to 1st if day is missing
      const year = monthMatch[3];
      extracted.date = `${month} ${day}, ${year}`;
    }
    
    // Passenger name
    if (i === 0 && cell.match(/^[A-Z\s]+$/) && !cell.match(/^(FLIGHT|GATE|SEAT|ZONE|BOARDING|DEPARTURE)/)) {
      extracted.passengerName = cell;
    }
  }
  
  return extracted;
}

function parseWithStrictHandling(text: string, validation: any): ParseResult {
  // First, try to parse as LaTeX table if it contains table markers
  let extractedData: Record<string, string> = {};
  
  if (text.includes('\\begin{tabular}') || text.includes('\\hline') || text.includes('\\begin{aligned}')) {
    console.log('Parsing LaTeX format from SimpleTex');
    extractedData = parseLatexTable(text);
    console.log('Extracted from LaTeX:', extractedData);
  }
  
  const normalizedText = text.toUpperCase().replace(/\s+/g, ' ').trim();
  const errors: any[] = [];
  const requiresManualEntry: string[] = [];

  const result: any = {
    status: 'upcoming',
    extractionMethod: 'simpletex_v3',
  };

  // Use LaTeX extracted data if available, otherwise fall back to validation
  const latexData = extractedData;
  const validationData = validation.extractedData || {};
  
  // Merge data sources (LaTeX takes priority)
  const mergedData = { ...validationData, ...latexData };
  
  // Fix flight numbers that might be missing airline code or have single letter
  if (mergedData.flightNumber) {
    console.log('Original flight number:', mergedData.flightNumber);
    const flightValidation = validateFlightNumber(mergedData.flightNumber);
    
    if (!flightValidation.isValid) {
      // Use smart airline detection from the full text
      const detectedAirline = detectAirlineFromText(text);
      console.log('Detected airline:', detectedAirline);
      
      // If we have high confidence in airline detection
      if (detectedAirline.confidence > 0.6) {
        if (mergedData.flightNumber.match(/^[A-Z]\d{3,4}$/)) {
          // Single letter flight number - replace with detected airline code
          mergedData.flightNumber = detectedAirline.code + mergedData.flightNumber.slice(1);
          console.log('Corrected flight number to:', mergedData.flightNumber);
        } else if (mergedData.flightNumber.match(/^\d{3,4}$/)) {
          // Just numbers - prepend airline code
          mergedData.flightNumber = detectedAirline.code + mergedData.flightNumber;
          console.log('Added airline code to flight number:', mergedData.flightNumber);
        }
        
        // Store the detected airline info
        mergedData.detectedAirline = detectedAirline;
      }
    }
  }

  // 1. AIRPORTS (Required) - with validation and correction
  const originValidation = mergedData.origin ? validateAirportCode(mergedData.origin) : { isValid: false, confidence: 0, suggestion: 'Could not extract origin airport' };
  const destValidation = mergedData.destination ? validateAirportCode(mergedData.destination) : { isValid: false, confidence: 0, suggestion: 'Could not extract destination airport' };
  
  if (!originValidation.isValid || !destValidation.isValid) {
    if (!mergedData.origin || !originValidation.isValid) {
      errors.push({
        field: 'origin',
        code: 'INVALID_AIRPORT_CODE',
        message: originValidation.suggestion || 'Could not extract valid origin airport',
        suggestion: originValidation.corrected ? 
          `Did you mean ${originValidation.corrected}?` : 
          'Please ensure origin airport is visible in the image',
      });
      requiresManualEntry.push('origin');
    }
    
    if (!mergedData.destination || !destValidation.isValid) {
      errors.push({
        field: 'destination',
        code: 'INVALID_AIRPORT_CODE',
        message: destValidation.suggestion || 'Could not extract valid destination airport',
        suggestion: destValidation.corrected ? 
          `Did you mean ${destValidation.corrected}?` : 
          'Please ensure destination airport is visible in the image',
      });
      requiresManualEntry.push('destination');
    }
    
    // If we have corrections with high confidence, use them
    if ('corrected' in originValidation && originValidation.corrected && 
        'confidence' in originValidation && originValidation.confidence >= 85 && 
        'corrected' in destValidation && destValidation.corrected && 
        'confidence' in destValidation && destValidation.confidence >= 85) {
      console.log('Using OCR corrections:', {
        origin: `${mergedData.origin} → ${originValidation.corrected}`,
        destination: `${mergedData.destination} → ${destValidation.corrected}`
      });
    } else {
      return { success: false, errors, requiresManualEntry };
    }
  }

  // Use validated/corrected airport codes
  const finalOrigin = ('corrected' in originValidation && originValidation.corrected) ? originValidation.corrected : mergedData.origin;
  const finalDestination = ('corrected' in destValidation && destValidation.corrected) ? destValidation.corrected : mergedData.destination;
  const originInfo = getAirportInfo(finalOrigin);
  const destInfo = getAirportInfo(finalDestination);

  result.origin = {
    airportCode: finalOrigin,
    city: originInfo?.city || finalOrigin,
    name: originInfo?.name,
    country: originInfo?.country,
    coordinates: originInfo ? { lat: originInfo.lat, lng: originInfo.lng } : undefined
  };

  result.destination = {
    airportCode: finalDestination,
    city: destInfo?.city || finalDestination,
    name: destInfo?.name,
    country: destInfo?.country,
    coordinates: destInfo ? { lat: destInfo.lat, lng: destInfo.lng } : undefined
  };
  
  // Calculate flight distance
  const distance = calculateDistance(finalOrigin, finalDestination);
  if (distance) {
    result.distance = Math.round(distance);
  }

  // 2. FLIGHT INFO - with validation
  if (mergedData.flightNumber) {
    const flightValidation = validateFlightNumber(mergedData.flightNumber);
    
    if (flightValidation.isValid) {
      result.flightNumber = flightValidation.normalized;
      const airlineCode = flightValidation.normalized.match(/^[A-Z]{2}/)?.[0];
      if (airlineCode) {
        result.airline = getAirlineName(airlineCode);
        result.airlineCode = airlineCode;
      }
    } else {
      errors.push({
        field: 'flightNumber',
        code: 'INVALID_FLIGHT_NUMBER',
        message: `Invalid flight number format: ${mergedData.flightNumber}`,
        suggestion: 'Flight number should be 2 letters followed by 1-4 digits (e.g., DL123)'
      });
      requiresManualEntry.push('flightNumber');
    }
  } else {
    requiresManualEntry.push('flightNumber');
  }

  // Add gate, seat, zone if extracted from LaTeX
  if (mergedData.gate) result.gate = mergedData.gate;
  if (mergedData.seat) result.seat = mergedData.seat;
  if (mergedData.zone) result.boardingZone = mergedData.zone;
  if (mergedData.passengerName) result.passengerName = mergedData.passengerName;

  // 3. DATE EXTRACTION (More flexible for OCR)
  let flightDate: Date | null = null;
  if (mergedData.date) {
    try {
      // Try to use date from LaTeX extraction first
      const dateText = mergedData.date;
      flightDate = strictDateExtraction(dateText);
      result.flightDate = flightDate.toISOString();
    } catch (error) {
      if (error instanceof BoardingPassError) {
        // For OCR, we'll still use the date even if it's outside the "valid" range
        // The user can correct it if needed
        try {
          // Try a more basic date parse
          const basicDate = new Date(mergedData.date);
          if (!isNaN(basicDate.getTime())) {
            result.flightDate = basicDate.toISOString();
            errors.push({
              field: 'date',
              code: 'DATE_VALIDATION_WARNING',
              message: `Date ${basicDate.toISOString()} may be incorrect`,
              suggestion: 'Please verify the flight date',
            });
          }
        } catch {
          errors.push({
            field: 'date',
            code: error.code,
            message: error.message,
            suggestion: error.context.suggestion || 'Please enter the flight date manually',
          });
          requiresManualEntry.push('date');
        }
      }
    }
  } else {
    requiresManualEntry.push('date');
  }

  // 4. TIME EXTRACTION (Timezone-aware)
  const timeOrder = getAirlineTimeOrder(result.airlineCode || 'default');

  // Departure time - use LaTeX extracted time if available
  const departureTimeText = mergedData.departureTime || mergedData.boardingTime || normalizedText;
  console.log('Parsing departure time:', departureTimeText, 'for airport:', result.origin.airportCode);
  const departureResult = safeParseTime(departureTimeText, result.origin.airportCode, 'departure');
  
  if (departureResult.success && departureResult.time) {
    result.scheduledDepartureTime = departureResult.time;
    result.origin.timezone = departureResult.timezone;
  } else if (mergedData.departureTime && result.flightDate) {
    // Try to construct the time manually if we have the components
    try {
      const baseDate = new Date(result.flightDate);
      const timeMatch = mergedData.departureTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const meridiem = timeMatch[3];
        
        if (meridiem) {
          if (meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;
          if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
        }
        
        baseDate.setHours(hours, minutes, 0, 0);
        result.scheduledDepartureTime = baseDate.toISOString();
        console.log('Manually constructed departure time:', result.scheduledDepartureTime);
      }
    } catch (e) {
      console.error('Failed to manually construct departure time:', e);
    }
  }
  
  if (!result.scheduledDepartureTime) {
    errors.push({
      field: 'departureTime',
      code: departureResult.error?.code || 'TIME_PARSE_FAILED',
      message: departureResult.error?.message || 'Could not extract departure time',
      suggestion: departureResult.error?.suggestion || 'Please enter departure time manually',
    });
    requiresManualEntry.push('departureTime');
  }

  // Arrival time
  const arrivalResult = safeParseTime(normalizedText, result.destination.airportCode, 'arrival');
  if (arrivalResult.success && arrivalResult.time) {
    result.scheduledArrivalTime = arrivalResult.time;
    result.destination.timezone = arrivalResult.timezone;
  } else if (result.scheduledDepartureTime) {
    // Estimate arrival based on route or use a default duration
    try {
      result.scheduledArrivalTime = estimateArrivalTime(
        result.scheduledDepartureTime,
        result.origin.airportCode,
        result.destination.airportCode
      );
      result.arrivalTimeEstimated = true;
    } catch (error) {
      // If estimation fails, add a default 3 hour flight time
      try {
        const depTime = new Date(result.scheduledDepartureTime);
        const arrTime = new Date(depTime.getTime() + (3 * 60 * 60 * 1000)); // Add 3 hours
        result.scheduledArrivalTime = arrTime.toISOString();
        result.arrivalTimeEstimated = true;
        console.log('Used default 3-hour flight duration for arrival time');
      } catch (e) {
        errors.push({
          field: 'arrivalTime',
          code: 'ESTIMATION_FAILED',
          message: 'Could not estimate arrival time',
          suggestion: 'Please enter arrival time manually',
        });
        requiresManualEntry.push('arrivalTime');
      }
    }
  } else {
    // No departure time, can't estimate arrival
    requiresManualEntry.push('arrivalTime');
  }

  // Boarding time (optional)
  const boardingResult = safeParseTime(normalizedText, result.origin.airportCode, 'boarding');
  if (boardingResult.success && boardingResult.time) {
    result.boardingTime = boardingResult.time;
  }

  // 5. OPTIONAL FIELDS
  if (extractedData.seat) {
    result.seatNumber = extractedData.seat;
  }

  if (extractedData.gate) {
    result.origin.gate = extractedData.gate;
  }

  // Extract confirmation code
  const confirmationMatch = normalizedText.match(/(?:CONF|PNR|REF)\s*:?\s*([A-Z0-9]{5,7})/);
  if (confirmationMatch) {
    result.confirmationCode = confirmationMatch[1];
  }

  // 6. METADATA
  result.extractionMetadata = {
    confidence: validation.cleanText ? 0.8 : 0.5,
    warnings: errors.filter(e => !requiresManualEntry.includes(e.field)),
    timestamp: new Date().toISOString(),
    timeOrder: timeOrder,
    estimatedFields: result.arrivalTimeEstimated ? ['arrivalTime'] : [],
  };

  // Determine success - we're successful if we extracted at least origin and destination
  const hasMinimumData = result.origin && result.destination;
  
  // Only truly critical fields that would prevent any use of the data
  const absolutelyCriticalMissing = [];
  if (!result.origin || !result.destination) {
    absolutelyCriticalMissing.push(...requiresManualEntry.filter(f => ['origin', 'destination'].includes(f)));
  }

  if (absolutelyCriticalMissing.length > 0) {
    return {
      success: false,
      data: result,
      errors,
      requiresManualEntry,
    };
  }

  // We have enough data to be useful - return success with any warnings/errors
  return {
    success: true,
    data: result,
    errors: errors.length > 0 ? errors : undefined,
    requiresManualEntry: requiresManualEntry.length > 0 ? requiresManualEntry : undefined,
  };
}

function getAirlineName(code: string): string {
  // Use the airline-codes validation to get the actual airline data
  const validation = validateAirlineCode(code);
  if (validation.isValid && validation.airline) {
    return validation.airline.name || validation.airline.attributes?.name || 'Unknown';
  }
  
  // Fallback to common airlines if not found
  const airlines: Record<string, string> = {
    AA: 'American Airlines',
    DL: 'Delta Air Lines',
    UA: 'United Airlines',
    WN: 'Southwest Airlines',
    B6: 'JetBlue Airways',
    AS: 'Alaska Airlines',
    NK: 'Spirit Airlines',
    F9: 'Frontier Airlines',
    HA: 'Hawaiian Airlines',
    FR: 'Ryanair',
    U2: 'easyJet',
    BA: 'British Airways',
    LH: 'Lufthansa',
    AF: 'Air France',
    KL: 'KLM',
  };

  return airlines[code] || 'Unknown';
}
