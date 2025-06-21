import React, { useState, useEffect } from 'react';
import { 
  MenuItem, 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  CircularProgress,
  SelectChangeEvent 
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { chileLocationService, Region, City } from '../services/chileLocationService';

interface LocationSelectorProps {
  value: string;
  onChange: (location: string) => void;
  fullWidth?: boolean;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ 
  value, 
  onChange, 
  fullWidth = true 
}) => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Parse existing location value
  useEffect(() => {
    if (value && value.includes(',')) {
      const [cityName, regionName] = value.split(',').map(s => s.trim());
      setSelectedCity(cityName);
      setSelectedRegion(regionName);
    } else {
      setSelectedCity(value);
    }
  }, [value]);

  // Load regions on component mount
  useEffect(() => {
    const loadRegions = async () => {
      setLoading(true);
      try {
        const regionsData = await chileLocationService.getRegions();
        setRegions(regionsData);
      } catch (error) {
        console.error('Error loading regions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRegions();
  }, []);
  // Load cities when region changes
  useEffect(() => {
    if (selectedRegion) {
      const loadCities = async () => {
        setLoadingCities(true);
        try {
          const region = regions.find(r => r.name === selectedRegion);
          if (region) {
            const citiesData = await chileLocationService.getCitiesByRegion(region.id);
            setCities(citiesData);
          }
        } catch (error) {
          console.error('Error loading cities:', error);
          setCities([]);
        } finally {
          setLoadingCities(false);
        }
      };

      loadCities();
    } else {
      setCities([]);
      setLoadingCities(false);
    }
  }, [selectedRegion, regions]);

  const handleRegionChange = (event: SelectChangeEvent<string>) => {
    const regionName = event.target.value;
    setSelectedRegion(regionName);
    setSelectedCity('');
    onChange(''); // Clear the location when region changes
  };
  const handleCityChange = (event: SelectChangeEvent<string>) => {
    const cityName = event.target.value;
    setSelectedCity(cityName);
    
    if (cityName && selectedRegion) {
      onChange(`${cityName}, ${selectedRegion}`);
    } else {
      onChange(cityName);
    }
  };  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Region Selector */}      <FormControl 
        fullWidth={fullWidth}
      >
        <InputLabel>Región</InputLabel>
        <Select
          value={selectedRegion}
          onChange={handleRegionChange}
          label="Región"
          disabled={loading}
          startAdornment={<LocationOnIcon sx={{ mr: 1, color: 'action.active' }} />}
          sx={{
            '& .MuiSelect-select': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }
          }}          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: 300,
                '& .MuiMenuItem-root': {
                  fontSize: '0.875rem',
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                  padding: '8px 16px'
                }
              }
            }
          }}
        >
          {loading ? (
            <MenuItem disabled>
              <CircularProgress size={20} />
            </MenuItem>
          ) : (
            regions.map((region) => (
              <MenuItem key={region.id} value={region.name}>
                {region.name} ({region.romanNumber})
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      {/* City Selector */}      <FormControl 
        fullWidth={fullWidth} 
        disabled={!selectedRegion}
      >
        <InputLabel>Ciudad/Comuna</InputLabel>
        <Select
          value={selectedCity}
          onChange={handleCityChange}
          label="Ciudad/Comuna"
          disabled={!selectedRegion || loadingCities}
          sx={{
            '& .MuiSelect-select': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }
          }}          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: 300,
                '& .MuiMenuItem-root': {
                  fontSize: '0.875rem',
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                  padding: '8px 16px'
                }
              }
            }
          }}
        >
          {loadingCities ? (
            <MenuItem disabled>
              <CircularProgress size={20} />
            </MenuItem>
          ) : (
            cities.map((city) => (
              <MenuItem key={city.id} value={city.name}>
                {city.name}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>
    </Box>
  );
};

export default LocationSelector;
