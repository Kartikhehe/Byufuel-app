import React, { useState, useContext, useEffect } from "react";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  useTheme,
  Link,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

export default function SignupPage() {
  const theme = useTheme();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Client-side validation
    if (!email || !password || !fullName) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    try {
      // 1. Signup → backend sets cookies
      const res = await authAPI.signup(email, password, fullName);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Signup failed' }));
        throw new Error(data.error || data.message || "Signup failed");
      }

      const signupData = await res.json();

      // 2. Fetch user info
      const userRes = await authAPI.getCurrentUser();

      if (!userRes.ok) {
        // If signup succeeded but we can't get user, use signup response
        if (signupData.user) {
          login(signupData.user);
          return;
        }
        throw new Error("Failed to fetch user info");
      }
      
      const userData = await userRes.json();

      // 3. Update AuthProvider state → triggers redirect automatically
      login(userData);
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || "An error occurred during signup. Please try again.");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        maxWidth: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: 'background.default',
        position: "relative",
        overflow: "hidden",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 5,
          maxWidth: 480,
          width: "100%",
          borderRadius: "24px",
          bgcolor: 'background.paper',
          backdropFilter: "blur(10px)",
          border: "1px solid",
          borderColor: 'divider',
          boxShadow: theme.shadows[8],
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header with Icon */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "16px",
              background: `linear-gradient(135deg, #4CAF50, #388E3C)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
              boxShadow: `0 8px 20px rgba(76, 175, 80, 0.4)`,
            }}
          >
            <PersonAddIcon sx={{ fontSize: 32, color: "white" }} />
          </Box>
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontWeight: 700,
              textAlign: "center",
              color: "text.primary",
              letterSpacing: "-0.5px",
            }}
          >
            Create Account
          </Typography>
          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              color: "text.secondary",
              mt: 1,
            }}
          >
            Sign up to get started with your account
          </Typography>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: "12px",
              "& .MuiAlert-icon": {
                fontSize: "24px",
              },
            }}
          >
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          {/* Full Name Field */}
          <Box sx={{ mb: 2.5 }}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: "text.secondary" }}
            >
              Full Name
            </Typography>
            <TextField
              required
              fullWidth
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              InputProps={{
                startAdornment: (
                  <PersonIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  bgcolor: 'background.elevation1',
                  transition: "all 0.3s ease",
                  "&:hover": {
                    bgcolor: 'background.paper',
                    boxShadow: `0 4px 12px rgba(76, 175, 80, 0.14)`,
                  },
                  "&.Mui-focused": {
                    bgcolor: 'background.paper',
                    boxShadow: `0 4px 12px rgba(76, 175, 80, 0.26)`,
                  },
                },
              }}
            />
          </Box>

          {/* Email Field */}
          <Box sx={{ mb: 2.5 }}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: "text.secondary" }}
            >
              Email Address
            </Typography>
            <TextField
              required
              fullWidth
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <EmailIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  bgcolor: 'background.elevation1',
                  transition: "all 0.3s ease",
                  "&:hover": {
                    bgcolor: 'background.paper',
                    boxShadow: `0 4px 12px rgba(76, 175, 80, 0.14)`,
                  },
                  "&.Mui-focused": {
                    bgcolor: 'background.paper',
                    boxShadow: `0 4px 12px rgba(76, 175, 80, 0.26)`,
                  },
                },
              }}
            />
          </Box>

          {/* Password Field */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: "text.secondary" }}
            >
              Password
            </Typography>
            <TextField
              required
              fullWidth
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <LockIcon
                    sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
                  />
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  bgcolor: 'background.elevation1',
                  transition: "all 0.3s ease",
                  "&:hover": {
                    bgcolor: 'background.paper',
                    boxShadow: `0 4px 12px rgba(76, 175, 80, 0.14)`,
                  },
                  "&.Mui-focused": {
                    bgcolor: 'background.paper',
                    boxShadow: `0 4px 12px rgba(76, 175, 80, 0.26)`,
                  },
                },
              }}
            />
          </Box>

          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              py: 1.8,
              fontWeight: 700,
              fontSize: 16,
              borderRadius: "12px",
              textTransform: "none",
              background: `linear-gradient(135deg, #4CAF50, #388E3C)`,
              boxShadow: `0 8px 20px rgba(76, 175, 80, 0.59)`,
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: "-100%",
                width: "100%",
                height: "100%",
                background:
                  "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
                transition: "left 0.5s ease",
              },
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: `0 12px 30px rgba(76, 175, 80, 0.8)`,
                "&::before": {
                  left: "100%",
                },
              },
              "&:active": {
                transform: "translateY(0px)",
              },
            }}
          >
            Create Account
          </Button>
        </Box>

        {/* Sign In Link */}
        <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid", borderColor: 'divider' }}>
          <Typography
            sx={{
              textAlign: "center",
              color: "text.secondary",
              fontSize: "0.95rem",
            }}
          >
            Already have an account?{" "}
            <Link
              component="a"
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                navigate('/login');
              }}
              sx={{
                color: "#4CAF50",
                textDecoration: "none",
                fontWeight: 600,
                transition: "all 0.2s ease",
                "&:hover": {
                  color: "#388E3C",
                },
              }}
            >
              Sign In
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

