import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Alert, Button, Container, Card, Row, Col } from 'react-bootstrap';
import axios from 'axios';

const ConfirmEmailPage: React.FC = () => {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        await axios.get(
          `http://localhost:8000/api/auth/confirm-email/${uid}/${token}/`
        );
        setSuccess(true);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(
            err.response?.data?.error ||
            'An error occurred during email confirmation. The link may be invalid or expired.'
          );
        } else {
          setError('An unexpected error occurred.');
        }
      } finally {
        setLoading(false);
      }
    };

    confirmEmail();
  }, [uid, token]);

  return (
    <Container>
      <Row className="justify-content-center mt-5">
        <Col md={6}>
          <Card>
            <Card.Body className="text-center">
              <Card.Title className="mb-4">Email Confirmation</Card.Title>
              
              {loading && <p>Verifying your email...</p>}
              
              {!loading && success && (
                <>
                  <Alert variant="success">
                    Your email has been confirmed successfully! You can now log in.
                  </Alert>
                  <Link to="/login">
                    <Button variant="primary">Go to Login</Button>
                  </Link>
                </>
              )}
              
              {!loading && error && (
                <>
                  <Alert variant="danger">
                    {error}
                  </Alert>
                  <Link to="/register">
                    <Button variant="outline-secondary">Back to Register</Button>
                  </Link>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ConfirmEmailPage;
