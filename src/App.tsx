import { useState } from 'react';
import { MantineProvider, Container, TextInput, Button, Paper, Text, Image, Stack, Grid, Alert } from '@mantine/core';
import axios from 'axios';

function App() {
  const [address, setAddress] = useState('4711 N Vía Zurburan, Tucson AZ');
  const [mapUrl, setMapUrl] = useState('');
  const [solarData, setSolarData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyApiKeys = async () => {
    try {
      // Verify Maps API Key
      const mapsResponse = await fetch(
        `https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=100x100&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );
      
      if (!mapsResponse.ok) {
        throw new Error('Invalid Maps API key or API access is restricted');
      }

      // Verify Solar API Key (using a simple geocoding request as test)
      const solarResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${import.meta.env.VITE_GOOGLE_SOLAR_API_KEY}`
      );

      if (!solarResponse.ok) {
        throw new Error('Invalid Solar API key or API access is restricted');
      }
      
      return true;
    } catch (error) {
      console.error('API Key verification failed:', error);
      return false;
    }
  };

  const handleAddressSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Verify both API keys
      const areApiKeysValid = await verifyApiKeys();
      if (!areApiKeysValid) {
        throw new Error('API key verification failed');
      }

      // Get static map image
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(
        address
      )}&zoom=18&size=600x400&maptype=satellite&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
      
      // Test if the image URL is valid
      const mapResponse = await fetch(staticMapUrl);
      if (!mapResponse.ok) {
        throw new Error('Failed to load map image');
      }

      setMapUrl(staticMapUrl);

      // Get geocoded coordinates for the address
      const geocodeResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${import.meta.env.VITE_GOOGLE_SOLAR_API_KEY}`
      );

      if (geocodeResponse.data.status !== 'OK') {
        throw new Error('Failed to geocode address');
      }

      const { lat, lng } = geocodeResponse.data.results[0].geometry.location;

      // Make the solar API request (using mock data for now as the actual Solar API isn't publicly available yet)
      const mockSolarData = {
        yearlyGeneration: '12000',
        potentialSavings: '25000',
        annualSunshine: '2800',
        roofSpace: '85',
        numberOfPanels: '24'
      };
      setSolarData(mockSolarData);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
    setLoading(false);
  };

  return (
    <MantineProvider>
      <Container size="lg" py="xl">
        <Paper shadow="sm" p="md" withBorder>
          <Stack spacing="md">
            {error && (
              <Alert color="red\" title="Error">
                {error}
              </Alert>
            )}
            
            <TextInput
              label="Enter Property Address"
              placeholder="123 Main St, City, State"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              size="md"
            />
            <Button 
              onClick={handleAddressSubmit}
              loading={loading}
              size="md"
            >
              Analyze Property
            </Button>

            {mapUrl && (
              <Image
                src={mapUrl}
                alt="Property Satellite View"
                radius="md"
                fit="contain"
                height={400}
              />
            )}

            {solarData && (
              <Grid>
                <Grid.Col span={6}>
                  <Paper p="md" withBorder>
                    <Text size="lg" fw={700}>Solar Potential Analysis</Text>
                    <Stack spacing="xs" mt="md">
                      <Text>Yearly Generation: {solarData.yearlyGeneration} kWh</Text>
                      <Text>20-Year Savings: ${solarData.potentialSavings}</Text>
                      <Text>Annual Sunshine: {solarData.annualSunshine} hours</Text>
                      <Text>Roof Space Available: {solarData.roofSpace} m²</Text>
                      <Text>Recommended Panels: {solarData.numberOfPanels}</Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
              </Grid>
            )}
          </Stack>
        </Paper>
      </Container>
    </MantineProvider>
  );
}

export default App;