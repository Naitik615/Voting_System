import requests
import bz2
import os

def download_file(url, filename):
    print(f"Downloading {filename}...")
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    with open(filename, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    print("Download complete!")

def extract_bz2(bz2_file, output_file):
    print(f"Extracting {bz2_file}...")
    with bz2.BZ2File(bz2_file, 'rb') as source, open(output_file, 'wb') as dest:
        dest.write(source.read())
    print("Extraction complete!")
    
    # Remove the bz2 file after extraction
    os.remove(bz2_file)
    print(f"Removed {bz2_file}")

def main():
    url = "http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2"
    bz2_file = "shape_predictor_68_face_landmarks.dat.bz2"
    output_file = "shape_predictor_68_face_landmarks.dat"
    
    try:
        download_file(url, bz2_file)
        extract_bz2(bz2_file, output_file)
        print("\nFacial landmark predictor file is ready to use!")
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main() 