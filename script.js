let map;
let markers = [];
let watchId;
let directionsService;
let directionsRenderer;
let geocoder;
const alertRadius = 500; // 알림 반경 (미터)

// 카테고리별 장소 데이터 (예시)
const locations = {
    playground: [
        { name: "놀이터 A", lat: 37.5665, lng: 126.978 },
        { name: "놀이터 B", lat: 37.570, lng: 126.975 }
    ],
    snack: [
        { name: "간식 가게 A", lat: 37.566, lng: 126.980 },
        { name: "간식 가게 B", lat: 37.575, lng: 126.975 }
    ],
    help: [
        { name: "도움 요청 센터 A", lat: 37.568, lng: 126.977 },
        { name: "도움 요청 센터 B", lat: 37.573, lng: 126.979 }
    ],
    emergency: [
        { name: "비상벨 A", lat: 37.576, lng: 126.976 },
        { name: "비상벨 B", lat: 37.577, lng: 126.978 }
    ]
};

        // 지도 초기화
        function initMap() {
            map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: 37.5762269, lng: 126.914531 }, // 지도 시작 위치
                zoom: 15
            });

            // KML 오버레이 추가
            const kmlLayer = new google.maps.KmlLayer({
                url: 'https://raw.githubusercontent.com/jaehee01/kakao/refs/heads/main/schoolzone.kml', // KML 파일의 URL
                map: map
            });

            directionsService = new google.maps.DirectionsService();
            directionsRenderer = new google.maps.DirectionsRenderer();
            directionsRenderer.setMap(map);
            geocoder = new google.maps.Geocoder();

            // '내 위치' 버튼 클릭 이벤트 추가
            document.getElementById('location-button').addEventListener('click', getLocation);

            // 아이콘 클릭 이벤트 추가
            const icons = document.querySelectorAll('.icon');
            icons.forEach(icon => {
                icon.addEventListener('click', () => {
                    const category = icon.getAttribute('data-category');
                    showMarkers(category);
                });
            });

            // 검색 버튼 클릭 이벤트 추가
            document.getElementById('search-button').addEventListener('click', () => {
                const query = document.getElementById('search-input').value;
                searchPlace(query);
            });
        }

        // 사용자 위치를 가져오는 함수
        function getLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    const userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    map.setCenter(userLocation);
                    addUserMarker(userLocation);
                    reverseGeocode(userLocation);
                }, () => {
                    alert('위치 정보를 가져오는 데 실패했습니다.');
                });
            } else {
                alert('이 브라우저는 Geolocation을 지원하지 않습니다.');
            }
        }

        // 사용자 위치에 마커 추가
        function addUserMarker(location) {
            clearMarkers();
            const marker = new google.maps.Marker({
                position: location,
                map: map,
                title: "내 위치",
                icon: {
                    url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                }
            });
            markers.push(marker);
        }

        // 위치를 주소로 변환하는 함수
        function reverseGeocode(location) {
            geocoder.geocode({ location: location }, (results, status) => {
                if (status === 'OK') {
                    if (results[0]) {
                        alert('현재 위치: ' + results[0].formatted_address);
                    } else {
                        alert('주소를 찾을 수 없습니다.');
                    }
                } else {
                    alert('Geocoder의 요청에 문제가 발생했습니다: ' + status);
                }
            });
        }

        // 마커를 제거하는 함수
        function clearMarkers() {
            markers.forEach(marker => {
                marker.setMap(null);
            });
            markers = [];
        }

        // 장소 검색 함수
        function searchPlace(query) {
            const service = new google.maps.places.PlacesService(map);
            const request = {
                query: query,
                location: map.getCenter(),
                radius: '500'
            };

            service.textSearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    clearMarkers(); // 기존 마커 삭제

                    results.forEach(place => {
                        const marker = new google.maps.Marker({
                            position: place.geometry.location,
                            map: map,
                            title: place.name
                        });

                        const infoWindow = new google.maps.InfoWindow({
                            content: place.name
                        });

                        marker.addListener('click', () => {
                            infoWindow.open(map, marker);
                        });

                        markers.push(marker);
                        startGeolocation(place.geometry.location); // 알림 기능 시작
                    });

                    map.setCenter(results[0].geometry.location);
                }
            });
        }

        // 현재 위치 추적 및 거리 계산
        function startGeolocation(placeLocation) {
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(position => {
                    const userLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                    const distance = google.maps.geometry.spherical.computeDistanceBetween(userLocation, placeLocation);

                    if (distance <= alertRadius) {
                        alert(`당신은 ${alertRadius}미터 반경 내에 있는 ${placeLocation.toUrlValue()}에 가까워졌습니다.`);
                    }
                });
            } else {
                alert("이 브라우저는 Geolocation을 지원하지 않습니다.");
            }
        }

        // 마커 표시 함수
        function showMarkers(category) {
            clearMarkers();

            const selectedLocations = locations[category] || [];
            selectedLocations.forEach(location => {
                const marker = new google.maps.Marker({
                    position: { lat: location.lat, lng: location.lng },
                    map: map,
                    title: location.name
                });

                marker.addListener('click', () => {
                    const userLocation = { lat: 37.5665, lng: 126.978 }; // 예시: 사용자의 현재 위치 (고정값으로 설정)
                    calculateRoute(userLocation, marker.position);
                });

                markers.push(marker);
            });
        }

// 경로 계산 함수
function calculateRoute(origin, destination) {
    const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.WALKING // 이동 모드 설정 (WALKING, DRIVING, BICYCLING, TRANSIT)
    };

    directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
        } else {
            alert("경로를 찾을 수 없습니다.");
        }
    });
}

// 페이지 로드 시 지도 초기화
window.onload = initMap;
