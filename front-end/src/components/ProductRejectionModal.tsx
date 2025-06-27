import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ProductionQuantityLimitsIcon from '@mui/icons-material/ProductionQuantityLimits';

interface ProductRejectionModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  rejectionReason: string;
  category?: string;
}

const ProductRejectionModal: React.FC<ProductRejectionModalProps> = ({
  open,
  onClose,
  productName,
  rejectionReason,
  category
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: '#ffebee',
          color: '#d32f2f',
          pb: 1
        }}
      >
        <ProductionQuantityLimitsIcon />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            Producto Rechazado
          </Typography>
          <Typography variant="subtitle2" sx={{ opacity: 0.8, fontWeight: 'normal' }}>
            {productName}
          </Typography>
        </Box>
        <IconButton
          aria-label="cerrar"
          onClick={onClose}
          sx={{
            color: '#d32f2f',
            '&:hover': {
              backgroundColor: 'rgba(211, 47, 47, 0.1)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
        >
          Tu producto no cumple con las políticas de venta de UOH Market
        </Alert>

        {category && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Categoría: <strong>{category}</strong>
            </Typography>
            <Divider />
          </Box>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#d32f2f' }}>
            Motivo del rechazo:
          </Typography>
          
          <Box
            sx={{
              backgroundColor: '#fafafa',
              border: '1px solid #e0e0e0',
              borderRadius: 1,
              p: 2,
              maxHeight: '200px',
              overflowY: 'auto'
            }}
          >
            <Typography 
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
                color: '#333'
              }}
            >
              {rejectionReason}
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>¿Qué puedes hacer?</strong>
            <br />
            • Revisa las políticas de UOH Market
            <br />
            • Modifica tu producto para cumplir con los requisitos
            <br />
            • Vuelve a publicar una versión corregida
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          color="primary"
          fullWidth
          sx={{
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 'bold'
          }}
        >
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductRejectionModal;
