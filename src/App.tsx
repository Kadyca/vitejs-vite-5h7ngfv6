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
      // First verify Maps API Key with a simpler endpoint
      const mapsResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );
      
      if (mapsResponse.data.status === 'REQUEST_DENIED') {
        throw new Error('Maps API key is invalid or missing required permissions');
      }

      // Verify Solar API with a simple request
      const solarResponse = await axios.post(
        'https://solar.googleapis.com/v1/dataLayers:get',
        {
          location: {
            latitude: 37.4220656,
            longitude: -122.0840897
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_SOLAR_API_KEY
          }
        }
      );

      return true;
    } catch (error) {
      console.error('API Key verification failed:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`API verification failed: ${error.response.data.error?.message || error.message}`);
      }
      throw error;
    }
  };

  const handleAddressSubmit = async () => {
    setLoading(true);
    setError(null);
    setSolarData(null);
    setMapUrl('');
    
    try {
      if (!address.trim()) {
        throw new Error('Please enter a valid address');
      }

      // Verify API keys
      await verifyApiKeys();

      // Get geocoded coordinates for the address
      const geocodeResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );

      if (geocodeResponse.data.status === 'ZERO_RESULTS') {
        throw new Error('Address not found. Please check the address and try again.');
      }

      if (geocodeResponse.data.status !== 'OK') {
        throw new Error(`Geocoding error: ${geocodeResponse.data.status}`);
      }

      const { lat, lng } = geocodeResponse.data.results[0].geometry.location;
      const formattedAddress = geocodeResponse.data.results[0].formatted_address;

      // Get static map image
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=600x400&maptype=satellite&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
      
      // Test if the image URL is valid
      const mapResponse = await fetch(staticMapUrl);
      if (!mapResponse.ok) {
        throw new Error('Failed to load map image');
      }

      setMapUrl(staticMapUrl);

      // Make the Solar API request with the correct API key
      const solarResponse = await axios.post(
        'https://solar.googleapis.com/v1/buildingInsights:findClosest',
        {
          location: {
            latitude: lat,
            longitude: lng
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_SOLAR_API_KEY
          }
        }
      );

      const solarData = {
        yearlyGeneration: solarResponse.data.solarPotential.maxArrayPanelsCount * solarResponse.data.solarPotential.panelCapacityWatts * solarResponse.data.solarPotential.yearlyEnergyDcKwh,
        potentialSavings: Math.round(solarResponse.data.solarPotential.yearlyEnergyDcKwh * 0.12 * 20), // Assuming $0.12 per kWh over 20 years
        annualSunshine: Math.round(solarResponse.data.solarPotential.sunshineQuantiles.reduce((a, b) => a + b) / solarResponse.data.solarPotential.sunshineQuantiles.length * 365 * 24),
        roofSpace: Math.round(solarResponse.data.solarPotential.maxArrayAreaMeters2),
        numberOfPanels: solarResponse.data.solarPotential.maxArrayPanelsCount,
        address: formattedAddress
      };

      setSolarData(solarData);
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
                      <Text>Address: {solarData.address}</Text>
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