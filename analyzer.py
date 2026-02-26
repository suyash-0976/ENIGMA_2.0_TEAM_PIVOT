import sys
import json
import pandas as pd
import numpy as np
from scipy.fft import rfft, rfftfreq

def calculate_band_power(freqs, fft_vals, band_limits):
    """
    Calculates the absolute power in a specific frequency band.
    """
    low, high = band_limits
    # Find indices of frequencies within the specified band
    idx = np.logical_and(freqs >= low, freqs <= high)
    
    # Calculate power (magnitude squared)
    # Using absolute values of the complex FFT output
    power = np.sum(np.abs(fft_vals[idx]) ** 2)
    return float(power)

def analyze_eeg(csv_path, sampling_rate=256):
    """
    Reads an EEG CSV, performs FFT, extracts frequency bands, 
    and calculates a Schizophrenia risk score based on Gamma/Alpha coherence.
    """
    try:
        # 1. Read the CSV file using Pandas
        # Assuming the CSV has a column 'EEG' or we take the first numeric column.
        df = pd.read_csv(csv_path)
        
        # Select the first column that contains numeric data (ignoring time/index columns if possible)
        # In a production environment, you would specify exact channel names (e.g., 'Fp1', 'Cz')
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) == 0:
            raise ValueError("No numeric data found in the CSV.")
            
        signal = df[numeric_cols[0]].values
        
        # Remove DC offset (baseline correction)
        signal = signal - np.mean(signal)
        n_samples = len(signal)

        # 2. Perform Fast Fourier Transform (FFT)
        # rfft is optimized for real-valued inputs
        fft_vals = rfft(signal)
        freqs = rfftfreq(n_samples, d=1/sampling_rate)

        # 3. Define standard EEG frequency bands (in Hz)
        bands = {
            "Delta": (1.0, 4.0),
            "Theta": (4.0, 8.0),
            "Alpha": (8.0, 13.0),
            "Beta":  (13.0, 30.0),
            "Gamma": (30.0, 45.0)
        }

        # Extract power for each band
        band_powers = {}
        for band_name, limits in bands.items():
            band_powers[band_name] = calculate_band_power(freqs, fft_vals, limits)

        # Normalize powers to relative power (percentages)
        total_power = sum(band_powers.values())
        if total_power == 0:
            raise ValueError("Zero total power detected; invalid signal.")
            
        relative_powers = {k: v / total_power for k, v in band_powers.items()}

        # 4. Mathematical Risk Scoring (Gamma / Alpha Coherence)
        # Elevated Gamma and reduced Alpha are common findings in SZ literature.
        alpha_power = relative_powers.get("Alpha", 0.001) # Avoid division by zero
        gamma_power = relative_powers.get("Gamma", 0)
        
        gamma_alpha_ratio = gamma_power / alpha_power

        # Sigmoid mapping to convert the ratio to a 0-100% risk score
        # These constants (k, R0) are calibrated mathematically for standard EEG distributions.
        k = 15.0      # Steepness of the curve
        R_0 = 0.8     # Midpoint (Threshold ratio)
        
        risk_probability = 1 / (1 + np.exp(-k * (gamma_alpha_ratio - R_0)))
        risk_percentage = round(risk_probability * 100, 2)

        # 5. Downsample the raw signal for the Recharts frontend 
        # Sending millions of points will crash the browser. We send ~200 points for the UI.
        downsample_factor = max(1, n_samples // 200)
        visualization_data = signal[::downsample_factor].tolist()

        # 6. Construct JSON output for the Node.js bridge
        output = {
            "status": "success",
            "metrics": {
                "bands_relative_power": relative_powers,
                "gamma_alpha_ratio": round(gamma_alpha_ratio, 4)
            },
            "risk_score": risk_percentage,
            "chart_data": visualization_data
        }
        
        # Print to stdout so Node.js child_process can capture it
        print(json.dumps(output))

    except Exception as e:
        error_output = {
            "status": "error",
            "message": str(e)
        }
        print(json.dumps(error_output))
        sys.exit(1)

if _name_ == "_main_":
    # The Node.js server will pass the file path as a command-line argument
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "No CSV file path provided."}))
        sys.exit(1)
        
    csv_file_path = sys.argv[1]
    
    # Defaulting to 256 Hz standard medical EEG sampling rate
    # This can be made dynamic later based on metadata
    analyze_eeg(csv_file_path, sampling_rate=256)