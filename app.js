// { calculateRoute } from "./routing.js";
// ============================================
// SUMAS NAVIGATION - MAIN JAVASCRIPT
// ============================================

// ============================================
// MAP INITIALIZATION
// ============================================

const sumasCenter = [6.8765, 7.4634];

const map = L.map("map").setView(sumasCenter, 17);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);


// =========================================
// GLOBAL VARIABLES
// ============================================

let locations = [];
let markers = [];

let userMarker = null;
let accuracyCircle = null;

// ==========================================
// LOAD CATEGORIES
// ==========================================

async function loadCategories() {

    try {

        const response = await fetch(
            "data/categories.json"
        );

        if (!response.ok) {
            throw new Error(
                `Unable to load categories.json (${response.status})`
            );
        }

        const categories = await response.json();

        displayCategories(categories);

        console.log(
            `Loaded ${categories.length} SUMAS categories.`
        );

    } catch (error) {

        console.error(
            "Error loading categories:",
            error
        );

    }
}

// ==========================================
// DISPLAY CATEGORIES
// ==========================================

function displayCategories(categories) {

    const categoryList =
        document.getElementById("categoryList");

    categoryList.innerHTML = "";

    categories.forEach((category) => {

        const categoryCard =
            document.createElement("div");

        categoryCard.className =
            "category-card";

        categoryCard.innerHTML = `
            <h3>${category.category_name}</h3>

            <p>
                ${category.description}
            </p>

            <button
                type="button"
                class="category-button"
                data-category-id="${category.category_id}"
            >
                View Facilities
            </button>
        `;

        categoryList.appendChild(categoryCard);
        const categoryButton =
    categoryCard.querySelector(".category-button");

categoryButton.addEventListener("click", () => {
    showCategoryFacilities(category.category_id);
});

    });
}


// ============================================
// LOAD REAL SUMAS DESTINATION DATA
// ============================================

async function loadDestinations() {

    try {

        const response = await fetch(
            "data/destinations.json"
        );

        if (!response.ok) {
            throw new Error(
                `Unable to load destinations.json (${response.status})`
            );
        }

        locations = await response.json();

// Connect each destination to the appropriate category
locations = locations.map((location) => {

    let categoryId = 6; // Default: Other Facilities

    const name = location.destination_name.toLowerCase();
    const type = location.destination_type.toLowerCase();

    // Academic
    if (
        type === "department" ||
        name.includes("faculty") ||
        name.includes("department") ||
        name.includes("library") ||
        name.includes("ict") ||
        name.includes("experiential learning") ||
        name.includes("engineering workshop")
    ) {
        categoryId = 1;
    }

    // Administrative
    else if (
        name.includes("administrative")
    ) {
        categoryId = 2;
    }

    // Health
    else if (
        name.includes("hospital") ||
        name.includes("medical center") ||
        name.includes("mother and child")
    ) {
        categoryId = 3;
    }

    // Religious
    else if (
        name.includes("church") ||
        name.includes("chapel") ||
        name.includes("mosque") ||
        name.includes("religious")
    ) {
        categoryId = 4;
    }

    // Recreational
    else if (
        name.includes("recreation") ||
        name.includes("sports") ||
        name.includes("stadium") ||
        name.includes("field")
    ) {
        categoryId = 5;
    }

    return {
        ...location,
        category_id: categoryId
    };

});


console.log(
    `Loaded ${locations.length} SUMAS destinations.`
);

console.log(
    "Categorized destinations:",
    locations
);

displayDestinations();
    } catch (error) {

        console.error(
            "Destination data error:",
            error
        );

        document.getElementById(
            "destinationName"
        ).innerHTML = `
            <strong>Unable to load SUMAS destination data.</strong><br>
            <small>
                Make sure destinations.json is inside the
                <strong>data</strong> folder.
            </small>
        `;

    }

}


// ============================================
// DISPLAY DESTINATIONS ON MAP
// ============================================

function displayDestinations() {

    // Remove old markers
    markers.forEach((item) => {
        map.removeLayer(item.marker);
    });

    markers = [];


    locations.forEach((location) => {

        const marker = L.marker([
            location.latitude,
            location.longitude
        ]).addTo(map);


        marker.bindPopup(`
            <strong>${escapeHTML(location.destination_name)}</strong>
            <br>
            <small>${escapeHTML(location.destination_type)}</small>
        `);


        marker.on("click", () => {

            showDestination(location);

        });


        markers.push({
            marker: marker,
            data: location
        });

    });

}


// ============================================
// SHOW SELECTED DESTINATION
// ============================================

function showDestination(location) {
    setRoutingDestination(location);

    const destinationName =
        document.getElementById(
            "destinationName"
        );


    let information = `
        <strong>${escapeHTML(
            location.destination_name
        )}</strong>
        <br>
        <small>
            ${escapeHTML(
                location.destination_type
            )}
        </small>
    `;


    if (location.faculty) {

        information += `
            <br>
            <small>
                ${escapeHTML(location.faculty)}
            </small>
        `;

    }


    destinationName.innerHTML =
        information;


    map.setView(
        [
            location.latitude,
            location.longitude
        ],
        18
    );

    // Find and highlight the selected destination marker
const selectedMarker = markers.find(
    (item) =>
        item.data.destination_id === location.destination_id
);

if (selectedMarker) {
    selectedMarker.marker.openPopup();
}

}


// ============================================
// SEARCH
// ============================================

const searchInput =
    document.getElementById(
        "searchInput"
    );


const searchResults =
    document.getElementById(
        "searchResults"
    );


searchInput.addEventListener(
    "input",
    () => {

        const searchText =
            searchInput.value
                .toLowerCase()
                .trim();


        if (searchText === "") {

            searchResults.style.display =
                "none";

            return;

        }


        const results =
            locations.filter(
                (location) => {

                    const name =
                        location.destination_name
                            .toLowerCase();

                    const type =
                        location.destination_type
                            .toLowerCase();

                    const faculty =
                        (location.faculty || "")
                            .toLowerCase();


                    return (
                        name.includes(searchText) ||
                        type.includes(searchText) ||
                        faculty.includes(searchText)
                    );

                }
            );


        searchResults.innerHTML = "";


        if (results.length === 0) {

            searchResults.innerHTML = `
                <div class="search-result-item">

                    <div class="result-title">
                        No location found
                    </div>

                    <div class="result-type">
                        Try another building,
                        faculty or department.
                    </div>

                </div>
            `;

            searchResults.style.display =
                "block";

            return;

        }


        results.forEach(
            (location) => {

                const resultItem =
                    document.createElement(
                        "div"
                    );


                resultItem.className =
                    "search-result-item";


                resultItem.innerHTML = `
                    <div class="result-title">
                        ${escapeHTML(
                            location.destination_name
                        )}
                    </div>

                    <div class="result-type">
                        ${escapeHTML(
                            location.destination_type
                        )}
                    </div>
                `;


                resultItem.addEventListener(
                    "click",
                    () => {

                        showDestination(
                            location
                        );

                        searchInput.value =
                            location.destination_name;

                        searchResults.style.display =
                            "none";

                    }
                );


                searchResults.appendChild(
                    resultItem
                );

            }
        );


        searchResults.style.display =
            "block";

    }
);


// ============================================
// CURRENT LOCATION
// ============================================

const locationButton =
    document.getElementById(
        "locationButton"
    );


locationButton.addEventListener(
    "click",
    () => {

        if (!navigator.geolocation) {

            alert(
                "Geolocation is not supported by your browser."
            );

            return;

        }


        locationButton.textContent =
            "📍 Locating...";


        navigator.geolocation.getCurrentPosition(

            (position) => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;

                const accuracy =
                    position.coords.accuracy;


                const userLocation = [
                    latitude,
                    longitude
                ];


                // Create or update user marker
                if (userMarker) {

                    userMarker.setLatLng(
                        userLocation
                    );

                } else {

                    userMarker =
                        L.circleMarker(
                            userLocation,
                            {
                                radius: 9,
                                color: "#0057ff",
                                fillColor: "#2196f3",
                                fillOpacity: 1,
                                weight: 3
                            }
                        ).addTo(map);


                    userMarker.bindPopup(
                        "<strong>📍 You are here</strong>"
                    );

                }


                // Create or update accuracy circle
                if (accuracyCircle) {

                    accuracyCircle.setLatLng(
                        userLocation
                    );

                    accuracyCircle.setRadius(
                        accuracy
                    );

                } else {

                    accuracyCircle =
                        L.circle(
                            userLocation,
                            {
                                radius: accuracy,
                                color: "#0057ff",
                                fillOpacity: 0.08,
                                weight: 1
                            }
                        ).addTo(map);

                }


                // Move map to user
                map.setView(
                    userLocation,
                    18
                );


                locationButton.textContent =
                    "📍 My Location";

            },


            (error) => {

                console.error(
                    "Location error:",
                    error
                );


                locationButton.textContent =
                    "📍 My Location";


                alert(
                    "Unable to get your location. Please allow location access and try again."
                );

            },


            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 5000
            }

        );

    }
);


// ============================================
// WALKING ROUTE BUTTON
// ============================================

const routeButton =
    document.getElementById(
        "routeButton"
    );


routeButton.addEventListener(
    "click",
    () => {

        alert(
            "Walking navigation will be added in the next stage."
        );

    }
);


// ============================================
// MENU BUTTON
// ============================================

const menuButton =
    document.getElementById(
        "menuButton"
    );


menuButton.addEventListener(
    "click",
    () => {

        alert(
            "The navigation menu will be added in the next stage."
        );

    }
);


// ============================================
// CLOSE SEARCH RESULTS
// ============================================

document.addEventListener(
    "click",
    (event) => {

        const clickedInsideSearch =
            searchInput.contains(
                event.target
            ) ||
            searchResults.contains(
                event.target
            );


        if (!clickedInsideSearch) {

            searchResults.style.display =
                "none";

        }

    }
);


// ============================================
// SECURITY: ESCAPE TEXT BEFORE HTML OUTPUT
// ============================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ============================================
// START APPLICATION
// ============================================

loadCategories();
loadDestinations();

// ==========================================
// CATEGORY FACILITY DISPLAY
// ==========================================

function showCategoryFacilities(categoryId) {

    // Hide welcome section
    const welcomeSection =
        document.querySelector(".welcome-section");

    // Hide category cards
    const categoriesSection =
        document.querySelector(".categories-section");

    // Hide search section
    const searchSection =
        document.querySelector(".search-section");

    // Get the section where facilities/faculties will appear
    const categorySection =
        document.getElementById("categorySection");


    if (welcomeSection) {
        welcomeSection.style.display = "none";
    }

    if (categoriesSection) {
        categoriesSection.style.display = "none";
    }

    if (searchSection) {
        searchSection.style.display = "none";
    }

    if (!categorySection) {
        console.error(
            "Category section was not found in the HTML."
        );
        return;
    }


    console.log(
        "Selected category:",
        categoryId
    );


    const facilities = locations.filter(
        location =>
            String(location.category_id) ===
            String(categoryId)
    );


    console.log(
        "Facilities found:",
        facilities
    );


    // ACADEMIC CATEGORY
    // Show faculties first
    if (String(categoryId) === "1") {

        const faculties = facilities.filter(
            location =>
                location.destination_type &&
                location.destination_type
                    .toLowerCase() === "facility" &&
                location.destination_name &&
                location.destination_name
                    .toLowerCase()
                    .includes("faculty")
        );


        console.log(
            "Academic faculties:",
            faculties
        );


        renderFacultyList(faculties);

        return;
    }


    // OTHER CATEGORIES
    renderFacilityList(facilities);
}


function renderFacultyList(faculties) {

    const categorySection =
        document.getElementById("categorySection");


    categorySection.style.display =
        "block";


    categorySection.innerHTML = `

        <div class="category-header">

            <h2>
                Academic Faculties
            </h2>

            <p>
                Select a faculty to view its departments.
            </p>

        </div>


        <div
            class="facility-list"
            id="facultyList"
        ></div>

    `;


    const facultyList =
        document.getElementById("facultyList");


    faculties.forEach(faculty => {

        const facultyItem =
            document.createElement("div");


        facultyItem.className =
            "facility-item";


        facultyItem.innerHTML = `

            <div class="facility-item-info">

                <h3>
                    ${escapeHTML(
                        faculty.destination_name
                    )}
                </h3>

                <span>
                    Faculty
                </span>

            </div>


            <div class="facility-arrow">
                →
            </div>

        `;


        facultyItem.addEventListener(
            "click",
            () => {

                showFacultyDepartments(
                    faculty
                );

            }
        );


        facultyList.appendChild(
            facultyItem
        );

    });

}
function showFacultyDepartments(faculty) {

    const categorySection = document.getElementById("categorySection");

    /*
     * Find departments that belong to
     * the selected faculty.
     */
    const departments = locations.filter(location => {

        return (
            location.destination_type &&
            location.destination_type.toLowerCase() === "department" &&
            location.faculty &&
            location.faculty.toLowerCase() ===
                faculty.destination_name.toLowerCase()
        );

    });

    console.log(
        "Selected faculty:",
        faculty.destination_name
    );

    console.log(
        "Departments found:",
        departments
    );

    categorySection.innerHTML = `
        <div class="category-header">

            <button
                type="button"
                class="back-category-btn"
                id="backToFaculties"
            >
                ← Back to Faculties
            </button>

            <h2>
                ${escapeHTML(faculty.destination_name)}
            </h2>

            <p>
                Select a department to view its location.
            </p>

        </div>

        <div class="facility-list" id="departmentList"></div>
    `;

    const departmentList =
        document.getElementById("departmentList");

    if (departments.length === 0) {

        departmentList.innerHTML = `
            <div class="no-results">
                No departments found for this faculty.
            </div>
        `;

    } else {

        departments.forEach(department => {

            const departmentItem =
                document.createElement("div");

            departmentItem.className =
                "facility-item";

            departmentItem.innerHTML = `
                <div class="facility-item-info">

                    <h3>
                        ${escapeHTML(
                            department.destination_name
                        )}
                    </h3>

                    <span>
                        Department
                    </span>

                </div>

                <div class="facility-arrow">
                    →
                </div>
            `;

            departmentItem.addEventListener(
                "click",
                () => {

                    showDestination(department);

                }
            );

            departmentList.appendChild(
                departmentItem
            );
        });
    }

    document
        .getElementById("backToFaculties")
        .addEventListener("click", () => {

            /*
             * Go back to the faculty list.
             */
            showCategoryFacilities(1);

        });
}
function renderFacilityList(facilities) {
    const categorySection =
        document.getElementById("categorySection");

    if (!categorySection) {
        console.error("Category section was not found.");
        return;
    }

    // Make sure the section is visible
    categorySection.style.display = "block";

    categorySection.innerHTML = `
        <div class="category-header">
            <button
                type="button"
                class="back-category-btn"
                id="backToCategories"
            >
                ← Back to Categories
            </button>

            <h2>Facilities</h2>

            <p>
                Select a facility to view its location.
            </p>
        </div>

        <div
            class="facility-list"
            id="facilityList"
        ></div>
    `;

    const facilityList =
        document.getElementById("facilityList");

    if (!facilityList) {
        console.error("Facility list was not found.");
        return;
    }

    if (facilities.length === 0) {
        facilityList.innerHTML = `
            <div class="no-results">
                No facilities found in this category.
            </div>
        `;
    } else {
        facilities.forEach((location) => {
            const facilityItem =
                document.createElement("div");

            facilityItem.className =
                "facility-item";

            facilityItem.innerHTML = `
                <div class="facility-item-info">

                    <h3>
                        ${escapeHTML(
                            location.destination_name
                        )}
                    </h3>

                    <span>
                        ${escapeHTML(
                            location.destination_type
                        )}
                    </span>

                </div>

                <div class="facility-arrow">
                    →
                </div>
            `;

            facilityItem.addEventListener(
                "click",
                () => {
                    showDestination(location);
                }
            );

            facilityList.appendChild(
                facilityItem
            );
        });
    }

    document
    .getElementById("backToCategories")
    .addEventListener("click", () => {
        closeCategoryFacilities();
    });
}
// ==========================================
// RETURN TO CATEGORY LIST
// ==========================================

function closeCategoryFacilities() {
    location.reload();
};

routeButton.addEventListener("click", function () {
    findWalkingRoute();
});