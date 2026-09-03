// Store the currently selected destination
let selectedDestination = null;

// Store the user's current location
let userLocation = null;

// Store the route layer
let routeLayer = null;
// Store the live GPS tracking ID
let locationWatchId = null;

// Store the live navigation marker
let navigationMarker = null;

// ========================================
// SET SELECTED DESTINATION
// ========================================

function setRoutingDestination(destination) {
  selectedDestination = destination;

  console.log(
    "Routing destination selected:",
    selectedDestination.destination_name,
  );
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
function startLiveNavigation() {
  // Stop any previous tracking session
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
  }

  locationWatchId = navigator.geolocation.watchPosition(
    function (position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const currentLocation = [latitude, longitude];

      // Create the moving navigation marker
      if (navigationMarker) {
        navigationMarker.setLatLng(currentLocation);
      } else {
        navigationMarker = L.circleMarker(currentLocation, {
          radius: 10,
          color: "#ffffff",
          fillColor: "#0057ff",
          fillOpacity: 1,
          weight: 3,
        }).addTo(map);

        navigationMarker.bindPopup("<strong>📍 You are here</strong>");
      }

      // Keep the map following the user
      map.panTo(currentLocation);

      console.log("Live user location:", latitude, longitude);

      // Check whether the user has reached the destination
      if (selectedDestination) {
        const distanceToDestination =
          calculateDistance(
            latitude,
            longitude,
            selectedDestination.latitude,
            selectedDestination.longitude,
          ) * 1000;
        const remainingDistanceElement =
          document.getElementById("remainingDistance");

        if (remainingDistanceElement) {
          remainingDistanceElement.textContent = `📍 Remaining Distance: ${distanceToDestination.toFixed(0)} meters`;
        }

        console.log(
          "Distance remaining:",
          distanceToDestination.toFixed(0),
          "meters",
        );

        // Consider destination reached within 20 meters
        if (distanceToDestination <= 20) {
          if (remainingDistanceElement) {
            remainingDistanceElement.textContent =
              "🎉 You have reached your destination!";
          }

          alert("🎉 You have reached your destination!");

          navigator.geolocation.clearWatch(locationWatchId);

          locationWatchId = null;
        }
      }
    },

    function (error) {
      console.error("Live location tracking error:", error);
    },

    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 10000,
    },
  );
}

// ========================================
// START WALKING ROUTE
// ========================================

function findWalkingRoute() {
  // Check if a destination has been selected
  if (!selectedDestination) {
    alert("Please select a destination first.");
    return;
  }

  console.log("Finding route to:", selectedDestination.destination_name);

  // Check if geolocation is supported
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  // Get the user's current location
  navigator.geolocation.getCurrentPosition(
    function (position) {
      const userLatitude = position.coords.latitude;
      const userLongitude = position.coords.longitude;

      console.log("User location:", {
        latitude: userLatitude,
        longitude: userLongitude,
      });

      console.log("Destination:", selectedDestination.destination_name);

      const destinationLatitude = selectedDestination.latitude;
      const destinationLongitude = selectedDestination.longitude;
      // Remove the previous route line
      if (routeLayer) {
        map.removeLayer(routeLayer);
      }

      // Create the route line
      const routingUrl =
        `https://router.project-osrm.org/route/v1/foot/` +
        `${userLongitude},${userLatitude};` +
        `${destinationLongitude},${destinationLatitude}` +
        `?overview=full&geometries=geojson`;

      fetch(routingUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Unable to calculate route.");
          }

          return response.json();
        })
        .then((data) => {
          if (!data.routes || data.routes.length === 0) {
            alert("No walking route was found.");
            return;
          }

          const route = data.routes[0];

          // Convert GeoJSON coordinates from
          // [longitude, latitude] to [latitude, longitude]
          const routeCoordinates = route.geometry.coordinates.map(
            (coordinate) => [coordinate[1], coordinate[0]],
          );

          // Remove previous route
          if (routeLayer) {
            map.removeLayer(routeLayer);
          }

          // Draw actual route
          routeLayer = L.polyline(routeCoordinates, {
            color: "#2f80ed",
            weight: 5,
            opacity: 0.8,
          }).addTo(map);

          // Fit map to route
          map.fitBounds(routeLayer.getBounds(), {
            padding: [50, 50],
          });

          // OSRM returns distance in meters
          const routeDistance = route.distance;

          // OSRM returns duration in seconds
          const routeDuration = route.duration;

          // // Display distance
          // document.getElementById(
          //   "distanceText"
          // ).textContent =
          //   `${routeDistance.toFixed(0)} meters`;

          // // Convert seconds to minutes
          // const walkingMinutes =
          //   routeDuration / 60;

          // document.getElementById(
          //   "walkingTimeText"
          // ).textContent =
          //   `${walkingMinutes.toFixed(1)} minutes`;
          // Actual route distance in meters
          //const routeDistance = route.distance;

          // Convert meters to kilometers
          const routeDistanceInKm = routeDistance / 1000;

          // Average walking speed: 5 km/h
          const walkingMinutes = (routeDistanceInKm / 5) * 60;
          document.getElementById("distanceText").textContent =
            `${routeDistance.toFixed(0)} meters`;

          document.getElementById("walkingTimeText").textContent =
            `${walkingMinutes.toFixed(1)} minutes`;

          document.getElementById("routeInfo").style.display = "block";

          console.log("Actual route distance:", routeDistance, "meters");

          console.log(
            "Actual route duration:",
            walkingMinutes.toFixed(1),
            "minutes",
          );
        })
        .catch((error) => {
          console.error("Routing error:", error);

          alert("Unable to calculate the walking route. Please try again.");
        });
      const routeBounds = L.latLngBounds([
        [userLatitude, userLongitude],
        [destinationLatitude, destinationLongitude],
      ]);

      map.fitBounds(routeBounds, {
        padding: [50, 50],
      });
      const distance = calculateDistance(
        userLatitude,
        userLongitude,
        destinationLatitude,
        destinationLongitude,
      );

      // Convert distance to meters
      const distanceInMeters = distance * 1000;

      // Average walking speed is approximately 5 km/h
      const walkingTime = (distance / 5) * 60;

      console.log("Distance:", distanceInMeters.toFixed(0), "meters");
      console.log("Estimated walking time:", walkingTime.toFixed(1), "minutes");
      document.getElementById("distanceText").textContent =
        `${distanceInMeters.toFixed(0)} meters`;

      document.getElementById("walkingTimeText").textContent =
        `${walkingTime.toFixed(1)} minutes`;

      document.getElementById("routeInfo").style.display = "block";
      startLiveNavigation();
      document.getElementById("clearRouteBtn").style.display = "inline-block";

      // Remove the previous route if one exists
      if (routeLayer) {
        map.removeLayer(routeLayer);
      }
    },

    function (error) {
      console.error("Unable to get location:", error);

      alert("Unable to get your location. Please allow location access.");
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    },
  );
}
function clearRoute() {
  // Remove the route line
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  // Hide route information
  document.getElementById("routeInfo").style.display = "none";

  // Hide Clear Route button
  document.getElementById("clearRouteBtn").style.display = "none";

  // Reset selected destination
  selectedDestination = null;

  console.log("Route cleared.");
  // Stop live location tracking
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }

  // Remove navigation marker
  if (navigationMarker) {
    map.removeLayer(navigationMarker);
    navigationMarker = null;
  }
}
