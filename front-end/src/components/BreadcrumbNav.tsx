import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export interface BreadcrumbItem {
  name: string;
  href: string;
  current?: boolean;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ items, className }) => {
  return (
    <div
      style={{
        width: '100%',
        marginTop: '16px',
        marginBottom: '16px',
        paddingLeft: '0',
        position: 'relative',
      }}
      className={className}
    >
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        aria-label="breadcrumb"
      >
        {/* Home siempre presente */}
        <Link
          component={RouterLink}
          to="/"
          underline="hover"
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: '#555',
            fontSize: '0.9rem',
            '&:hover': {
              color: '#004f9e'
            }
          }}
        >
          <HomeIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
          Inicio
        </Link>
        
        {/* Elementos de navegación dinámicos */}
        {items.map((item, index) => (
          item.current ? (
            <Typography 
              key={item.href}
              sx={{ 
                color: '#004f9e', 
                fontWeight: 500,
                fontSize: '0.9rem' 
              }}
            >
              {item.name}
            </Typography>
          ) : (
            <Link
              key={item.href}
              component={RouterLink}
              to={item.href}
              underline="hover"
              sx={{
                color: '#555',
                fontSize: '0.9rem',
                '&:hover': {
                  color: '#004f9e'
                }
              }}
            >
              {item.name}
            </Link>
          )
        ))}
      </Breadcrumbs>
    </div>
  );
};

export default BreadcrumbNav;