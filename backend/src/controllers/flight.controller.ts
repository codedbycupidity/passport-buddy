import { Request, Response } from 'express';
import Flight from '../models/Flight';
import { storageService } from '../services/storage.service';
import { parseBoardingPassWithTesseract } from '../utils/boardingPassTesseract';
import { parseWithGoogleVision } from '../utils/boardingPassGoogleVision';
import { calculateFlightDistance } from '../utils/distanceCalculator';

// Helper function to convert parser results to legacy format
function convertToLegacyFormat(data: any): any {
  if (!data) return null;
  
  // If it's already in legacy format, return as is
  if (data.airline && data.flightNumber && data.origin && data.destination) {
    return data;
  }
  
  // Convert from other formats
  return {
    airline: data.airline || data.airlineCode || null,
    flightNumber: data.flightNumber || null,
    origin: data.origin || { airportCode: null, city: null, country: null },
    destination: data.destination || { airportCode: null, city: null, country: null },
    departureTime: data.departureTime || null,
    arrivalTime: data.arrivalTime || null,
    passengerName: data.passengerName || data.passenger?.name || null,
    confirmationCode: data.confirmationCode || data.pnr || null,
    boardingInfo: data.boardingInfo || {
      gate: data.gate || null,
      seat: data.seat || data.seatNumber || null,
      zone: data.zone || data.boardingGroup || null,
      boardingTime: data.boardingTime || null
    },
    scheduledDepartureTime: data.scheduledDepartureTime || data.departureTime || null,
    scheduledArrivalTime: data.scheduledArrivalTime || data.arrivalTime || null
  };
}

export const uploadBoardingPass = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No boarding pass file provided' });
    }

    // Upload to storage with configurable folder
    const uploadFolder = process.env.BOARDING_PASS_UPLOAD_FOLDER || 'boarding-passes';
    const uploadResult = await storageService.upload(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      {
        folder: `${uploadFolder}/${userId}`,
      }
    );
    const boardingPassUrl = uploadResult.url;

    // Parse boarding pass data - Try Google Vision first, fallback to Tesseract
    const parserResults: any[] = [];
    let visionResult = null;
    
    // 1. Try Google Cloud Vision first
    if (process.env.GOOGLE_CLOUD_VISION_CREDENTIALS) {
      try {
        visionResult = await parseWithGoogleVision(file.buffer);
        if (visionResult) {
          parserResults.push({ parser: 'Google Vision', data: visionResult, confidence: 0.95 });
        }
      } catch (error) {
        console.log('Google Vision error:', error instanceof Error ? error.message : error);
      }
    }
    
    // 2. If Google Vision failed, run Tesseract as fallback
    if (!visionResult) {
      try {
        const tesseractResult = await parseBoardingPassWithTesseract(file.buffer, file.mimetype);
        if (tesseractResult) {
          const tesseractData = convertToLegacyFormat(tesseractResult);
          parserResults.push({ parser: 'Tesseract', data: tesseractData, confidence: 0.85 });
        }
      } catch (error) {
        console.log('Tesseract error:', error instanceof Error ? error.message : error);
      }
    }
    
    // Log summary of what each parser found
    console.log('\n========== PARSER RESULTS SUMMARY ==========');
    parserResults.forEach(result => {
      console.log(`\n${result.parser}:`);
      if (result.data?.origin?.airportCode && result.data?.destination?.airportCode) {
        console.log(`  Route: ${result.data.origin.airportCode} → ${result.data.destination.airportCode}`);
      }
      if (result.data?.flightNumber) {
        console.log(`  Flight: ${result.data.airline || ''}${result.data.flightNumber}`);
      }
      if (result.data?.passengerName) {
        console.log(`  Passenger: ${result.data.passengerName}`);
      }
      if (result.data?.boardingInfo?.gate) {
        console.log(`  Gate: ${result.data.boardingInfo.gate}`);
      }
      if (result.data?.boardingInfo?.seat) {
        console.log(`  Seat: ${result.data.boardingInfo.seat}`);
      }
      if (result.data?.boardingInfo?.zone) {
        console.log(`  Zone: ${result.data.boardingInfo.zone}`);
      }
      if (result.data?.confirmationCode) {
        console.log(`  Confirmation: ${result.data.confirmationCode}`);
      }
    });
    
    // Combine results from all parsers, prioritizing by confidence
    let parsedData = null;
    if (parserResults.length > 0) {
      // Sort by confidence
      parserResults.sort((a, b) => b.confidence - a.confidence);
      
      // Use highest confidence result as base
      parsedData = { ...parserResults[0].data };
      console.log(`\nUsing ${parserResults[0].parser} as base (confidence: ${parserResults[0].confidence})`);
      
      // Merge in missing fields from other parsers
      for (let i = 1; i < parserResults.length; i++) {
        const result = parserResults[i].data;
        if (!result) continue;
        
        // Fill in missing airport codes
        if ((!parsedData.origin?.airportCode || parsedData.origin?.airportCode === 'UNKNOWN') && result.origin?.airportCode && result.origin?.airportCode !== 'UNKNOWN') {
          console.log(`  Adding origin ${result.origin.airportCode} from ${parserResults[i].parser}`);
          parsedData.origin = result.origin;
        }
        if ((!parsedData.destination?.airportCode || parsedData.destination?.airportCode === 'UNKNOWN') && result.destination?.airportCode && result.destination?.airportCode !== 'UNKNOWN') {
          console.log(`  Adding destination ${result.destination.airportCode} from ${parserResults[i].parser}`);
          parsedData.destination = result.destination;
        }
        
        // Fill in missing flight info
        if (!parsedData.flightNumber && result.flightNumber) {
          console.log(`  Adding flight number ${result.flightNumber} from ${parserResults[i].parser}`);
          parsedData.flightNumber = result.flightNumber;
        }
        if (!parsedData.airline && result.airline) {
          console.log(`  Adding airline ${result.airline} from ${parserResults[i].parser}`);
          parsedData.airline = result.airline;
        }
        
        // Fill in missing boarding info
        if (!parsedData.boardingInfo) parsedData.boardingInfo = {};
        if (!parsedData.boardingInfo.gate && result.boardingInfo?.gate) {
          console.log(`  Adding gate ${result.boardingInfo.gate} from ${parserResults[i].parser}`);
          parsedData.boardingInfo.gate = result.boardingInfo.gate;
        }
        if (!parsedData.boardingInfo.seat && result.boardingInfo?.seat) {
          console.log(`  Adding seat ${result.boardingInfo.seat} from ${parserResults[i].parser}`);
          parsedData.boardingInfo.seat = result.boardingInfo.seat;
        }
        if (!parsedData.boardingInfo.zone && result.boardingInfo?.zone) {
          console.log(`  Adding zone ${result.boardingInfo.zone} from ${parserResults[i].parser}`);
          parsedData.boardingInfo.zone = result.boardingInfo.zone;
        }
        
        // Fill in missing times
        if (!parsedData.departureTime && result.departureTime) {
          console.log(`  Adding departure time from ${parserResults[i].parser}`);
          parsedData.departureTime = result.departureTime;
        }
        if (!parsedData.arrivalTime && result.arrivalTime) {
          console.log(`  Adding arrival time from ${parserResults[i].parser}`);
          parsedData.arrivalTime = result.arrivalTime;
        }
        if (!parsedData.scheduledDepartureTime && result.scheduledDepartureTime) {
          parsedData.scheduledDepartureTime = result.scheduledDepartureTime;
        }
        if (!parsedData.scheduledArrivalTime && result.scheduledArrivalTime) {
          parsedData.scheduledArrivalTime = result.scheduledArrivalTime;
        }
        
        // Fill in missing passenger info
        if (!parsedData.passengerName && result.passengerName) {
          console.log(`  Adding passenger name ${result.passengerName} from ${parserResults[i].parser}`);
          parsedData.passengerName = result.passengerName;
        }
        if (!parsedData.confirmationCode && result.confirmationCode) {
          console.log(`  Adding confirmation code ${result.confirmationCode} from ${parserResults[i].parser}`);
          parsedData.confirmationCode = result.confirmationCode;
        }
      }
      
      console.log('\n========== FINAL COMBINED RESULT ==========');
      console.log('Route:', parsedData.origin?.airportCode, '→', parsedData.destination?.airportCode);
      console.log('Flight:', parsedData.airline, parsedData.flightNumber);
      console.log('Passenger:', parsedData.passengerName);
      console.log('Gate:', parsedData.boardingInfo?.gate);
      console.log('Seat:', parsedData.boardingInfo?.seat);
      console.log('Zone:', parsedData.boardingInfo?.zone);
      console.log('Confirmation:', parsedData.confirmationCode);
      console.log('==========================================\n');
    }
    
    if (!parsedData) {
      return res.status(400).json({ message: 'Could not parse boarding pass data' });
    }

    // Calculate distance between airports
    const distance = await calculateFlightDistance(parsedData.origin.airportCode, parsedData.destination.airportCode);

    // Create flight record
    const flight = new Flight({
      userId,
      ...parsedData,
      distance,
      boardingPassUrl,
    });

    // Calculate points
    flight.points = flight.calculatePoints();


    await flight.save();

    res.status(201).json({
      message: 'Boarding pass uploaded successfully',
      flight,
    });
  } catch (error) {
    console.error('Error uploading boarding pass:', error);
    res.status(500).json({ message: 'Failed to upload boarding pass' });
  }
};

export const manualFlightEntry = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const flightData = req.body;

    console.log('Manual flight entry request:', { userId, flightData });

    // Validate required fields - only airports and date are required
    const requiredFields = ['origin', 'destination', 'scheduledDepartureTime'];
    for (const field of requiredFields) {
      if (!flightData[field]) {
        return res.status(400).json({ message: `Missing required field: ${field}` });
      }
    }

    // Estimate arrival time if not provided using route-based calculation
    if (!flightData.scheduledArrivalTime && flightData.origin && flightData.destination) {
      const { estimateArrivalTime } = require('../services/timeHandling.service');
      const departureDate = new Date(flightData.scheduledDepartureTime);
      flightData.scheduledArrivalTime = estimateArrivalTime(
        departureDate,
        flightData.origin.airportCode,
        flightData.destination.airportCode
      );
      console.log(`Estimated arrival time for ${flightData.origin.airportCode}-${flightData.destination.airportCode}`);
    }

    // Calculate distance if not provided
    if (!flightData.distance) {
      flightData.distance = await calculateFlightDistance(
        flightData.origin.airportCode,
        flightData.destination.airportCode
      );
    }

    // Create flight record
    const flight = new Flight({
      userId,
      ...flightData,
    });

    // Calculate points
    flight.points = flight.calculatePoints();


    await flight.save();

    res.status(201).json({
      message: 'Flight added successfully',
      flight,
    });
  } catch (error) {
    console.error('Error adding flight:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to add flight';
    res.status(500).json({ message: errorMessage, error: error instanceof Error ? error.stack : error });
  }
};

export const getMyFlights = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { status, airline, limit = 20, offset = 0 } = req.query;

    const query: any = { userId };

    if (status) {
      query.status = status;
    }

    if (airline) {
      query.airline = airline;
    }

    const flights = await Flight.find(query)
      .sort({ scheduledDepartureTime: -1 })
      .limit(Number(limit))
      .skip(Number(offset));

    const total = await Flight.countDocuments(query);

    res.json({
      flights,
      total,
      hasMore: Number(offset) + flights.length < total,
    });
  } catch (error) {
    console.error('Error getting flights:', error);
    res.status(500).json({ message: 'Failed to get flights' });
  }
};

export const getFlightStats = async (req: Request, res: Response) => {
  try {
    // Allow fetching stats for a specific user or default to authenticated user
    const { userId: queryUserId, year } = req.query;
    const targetUserId = queryUserId || req.user?._id;

    if (!targetUserId) {
      return res.status(400).json({ message: 'User ID required' });
    }

    const matchQuery: any = { userId: targetUserId };

    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      matchQuery.scheduledDepartureTime = { $gte: startDate, $lte: endDate };
    }

    const stats = await Flight.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalFlights: { $sum: 1 },
          totalDistance: { $sum: '$distance' },
          totalPoints: { $sum: '$points' },
          airlines: { $addToSet: '$airline' },
          destinations: { $addToSet: '$destination.city' },
          originCountries: { $addToSet: '$origin.country' },
          destCountries: { $addToSet: '$destination.country' },
        },
      },
      {
        $project: {
          _id: 0,
          totalFlights: 1,
          totalDistance: 1,
          totalPoints: 1,
          uniqueAirlines: { $size: '$airlines' },
          uniqueDestinations: { $size: '$destinations' },
          uniqueCountries: { 
            $size: { 
              $setUnion: ['$originCountries', '$destCountries'] 
            } 
          },
          airlines: 1,
          destinations: 1,
        },
      },
    ]);

    // Get flights by month
    const flightsByMonth = await Flight.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $month: '$scheduledDepartureTime' },
          count: { $sum: 1 },
          distance: { $sum: '$distance' },
          points: { $sum: '$points' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get top routes
    const topRoutes = await Flight.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            origin: '$origin.city',
            destination: '$destination.city',
          },
          count: { $sum: 1 },
          totalDistance: { $sum: '$distance' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      summary: stats[0] || {
        totalFlights: 0,
        totalDistance: 0,
        totalPoints: 0,
        uniqueAirlines: 0,
        uniqueDestinations: 0,
        uniqueCountries: 0,
      },
      flightsByMonth,
      topRoutes,
    });
  } catch (error) {
    console.error('Error getting flight stats:', error);
    res.status(500).json({ message: 'Failed to get flight statistics' });
  }
};

export const updateFlightStatus = async (req: Request, res: Response) => {
  try {
    const { flightId } = req.params;
    const { status } = req.body;
    const userId = req.user?._id;

    const flight = await Flight.findOne({ _id: flightId, userId });

    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    flight.status = status;
    await flight.save();

    res.json({
      message: 'Flight status updated',
      flight,
    });
  } catch (error) {
    console.error('Error updating flight status:', error);
    res.status(500).json({ message: 'Failed to update flight status' });
  }
};

export const getFlightById = async (req: Request, res: Response) => {
  try {
    const { flightId } = req.params;
    const userId = req.user?._id;

    const flight = await Flight.findOne({ _id: flightId, userId });

    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    res.json({ flight });
  } catch (error) {
    console.error('Error fetching flight:', error);
    res.status(500).json({ message: 'Failed to fetch flight' });
  }
};

export const updateFlight = async (req: Request, res: Response) => {
  try {
    const { flightId } = req.params;
    const userId = req.user?._id;
    const updates = req.body;

    // Don't allow updating certain fields
    delete updates._id;
    delete updates.userId;
    delete updates.boardingPassUrl;

    const flight = await Flight.findOneAndUpdate({ _id: flightId, userId }, updates, {
      new: true,
      runValidators: true,
    });

    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    // Recalculate points if flight details changed
    if (updates.seatClass || updates.distance) {
      flight.points = flight.calculatePoints();
      await flight.save();
    }

    res.json({
      message: 'Flight updated successfully',
      flight,
    });
  } catch (error) {
    console.error('Error updating flight:', error);
    res.status(500).json({ message: 'Failed to update flight' });
  }
};

export const deleteFlight = async (req: Request, res: Response) => {
  try {
    const { flightId } = req.params;
    const userId = req.user?._id;

    const flight = await Flight.findOneAndDelete({ _id: flightId, userId });

    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    res.json({ message: 'Flight deleted successfully' });
  } catch (error) {
    console.error('Error deleting flight:', error);
    res.status(500).json({ message: 'Failed to delete flight' });
  }
};

