import sanityClient from './sanityClient';

export interface SanityMarket {
  _id: string;
  _type: 'market';
  id: number;
  name: string;
  description: string;
  landing?: {
    _type: 'image';
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
  start: number;
  end: number;
  resolve: number;
  yes: number;
  no: number;
}

export class SanityService {
  // Get all markets from Sanity
  async getAllMarkets(): Promise<SanityMarket[]> {
    try {
      const query = `
        *[_type == "market"] | order(id asc) {
          _id,
          _type,
          id,
          name,
          description,
          landing,
          start,
          end,
          resolve,
          yes,
          no
        }
      `;
      
      const markets: SanityMarket[] = await sanityClient.fetch(query);
      console.log(`📊 Retrieved ${markets.length} markets from Sanity`);
      return markets;
    } catch (error) {
      console.error('Error fetching markets from Sanity:', error);
      throw error;
    }
  }

  // Get a specific market by ID
  async getMarketById(marketId: number): Promise<SanityMarket | null> {
    try {
      const query = `
        *[_type == "market" && id == $marketId][0] {
          _id,
          _type,
          id,
          name,
          description,
          landing,
          start,
          end,
          resolve,
          yes,
          no
        }
      `;
      
      const market: SanityMarket = await sanityClient.fetch(query, { marketId });
      return market || null;
    } catch (error) {
      console.error(`Error fetching market ${marketId} from Sanity:`, error);
      throw error;
    }
  }

  // Get landing image URL for a market
  async getMarketLandingImageUrl(marketId: number): Promise<string | null> {
    try {
      const query = `
        *[_type == "market" && id == $marketId][0] {
          "landingUrl": landing.asset->url
        }
      `;
      
      const result = await sanityClient.fetch(query, { marketId });
      return result?.landingUrl || null;
    } catch (error) {
      console.error(`Error fetching landing image for market ${marketId}:`, error);
      return null;
    }
  }

  // Get all markets with their landing image URLs
  async getAllMarketsWithImages(): Promise<Array<SanityMarket & { landingUrl?: string }>> {
    try {
      const query = `
        *[_type == "market"] | order(id asc) {
          _id,
          _type,  
          id,
          name,
          description,
          landing,
          start,
          end,
          resolve,
          yes,
          no,
          "landingUrl": landing.asset->url
        }
      `;
      
      const markets = await sanityClient.fetch(query);
      console.log(`📊 Retrieved ${markets.length} markets with images from Sanity`);
      return markets;
    } catch (error) {
      console.error('Error fetching markets with images from Sanity:', error);
      throw error;
    }
  }
}

export default new SanityService(); 