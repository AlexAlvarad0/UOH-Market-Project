import React from 'react';
import RealEstateAgentOutlinedIcon from '@mui/icons-material/RealEstateAgentOutlined';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import HikingOutlinedIcon from '@mui/icons-material/HikingOutlined';
import MicrowaveOutlinedIcon from '@mui/icons-material/MicrowaveOutlined';
import LocalActivityOutlinedIcon from '@mui/icons-material/LocalActivityOutlined';
import BedOutlinedIcon from '@mui/icons-material/BedOutlined';
import WatchOutlinedIcon from '@mui/icons-material/WatchOutlined';
import PianoOutlinedIcon from '@mui/icons-material/PianoOutlined';
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined';
import BookOutlinedIcon from '@mui/icons-material/BookOutlined';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import AllInboxOutlinedIcon from '@mui/icons-material/AllInboxOutlined';
import CheckroomOutlinedIcon from '@mui/icons-material/CheckroomOutlined';
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined';
import DesignServicesOutlinedIcon from '@mui/icons-material/DesignServicesOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import { SvgIconProps } from '@mui/material';

const iconMap: Record<string, React.ElementType> = {
  'Arriendos': RealEstateAgentOutlinedIcon,
  'Artes y Manualidades': BrushOutlinedIcon,
  'Cafetería y Snacks': LocalCafeOutlinedIcon,
  'Deportes y Outdoor': HikingOutlinedIcon,
  'Electrodomésticos': MicrowaveOutlinedIcon,
  'Entradas y Eventos': LocalActivityOutlinedIcon,
  'Hogar y Dormitorio': BedOutlinedIcon,
  'Relojes y Joyas': WatchOutlinedIcon,
  'Instrumentos Musicales': PianoOutlinedIcon,
  'Juegos y Entretenimiento': SportsEsportsOutlinedIcon,
  'Libros, película y música': BookOutlinedIcon,
  'Mascotas': PetsOutlinedIcon,
  'Varios': AllInboxOutlinedIcon,
  'Ropa y Accesorios': CheckroomOutlinedIcon,
  'Servicios Estudiantiles': DesignServicesOutlinedIcon,
  'Tecnología': SmartphoneOutlinedIcon,
  'Vehículos': DirectionsCarOutlinedIcon
};

interface CategoryIconProps extends SvgIconProps {
  name: string;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({ name, ...props }) => {
  const IconComponent = iconMap[name];
  return IconComponent ? <IconComponent {...props} /> : null;
};

export default CategoryIcon;
