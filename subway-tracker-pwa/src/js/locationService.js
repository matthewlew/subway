// Location service for detecting nearby stations
class LocationService {
    constructor() {
        this.currentLocation = null;
        this.watchId = null;

        // Full NYC Subway station list
        this.stations = [
            // 1/2/3
            { id: '101', name: 'Van Cortlandt Park-242 St', lat: 40.8898, lng: -73.8988, lines: ['1'] },
            { id: '103', name: 'Marble Hill-225 St', lat: 40.8748, lng: -73.9104, lines: ['1'] },
            { id: '104', name: 'Inwood-207 St', lat: 40.8677, lng: -73.9201, lines: ['1'] },
            { id: '106', name: '191 St', lat: 40.8615, lng: -73.9279, lines: ['1'] },
            { id: '107', name: '181 St', lat: 40.8580, lng: -73.9330, lines: ['1'] },
            { id: '108', name: '168 St-Washington Hts', lat: 40.8402, lng: -73.9394, lines: ['1'] },
            { id: '109', name: '157 St', lat: 40.8340, lng: -73.9408, lines: ['1'] },
            { id: '110', name: '145 St', lat: 40.8286, lng: -73.9420, lines: ['1'] },
            { id: '111', name: '137 St-City College', lat: 40.8224, lng: -73.9478, lines: ['1'] },
            { id: '112', name: '125 St', lat: 40.8159, lng: -73.9529, lines: ['1'] },
            { id: '113', name: '116 St-Columbia University', lat: 40.8077, lng: -73.9641, lines: ['1'] },
            { id: '114', name: 'Cathedral Pkwy-110 St', lat: 40.8030, lng: -73.9664, lines: ['1'] },
            { id: '115', name: '103 St', lat: 40.7999, lng: -73.9682, lines: ['1'] },
            { id: '116', name: '96 St', lat: 40.7941, lng: -73.9722, lines: ['1', '2', '3'] },
            { id: '117', name: '86 St', lat: 40.7886, lng: -73.9760, lines: ['1'] },
            { id: '118', name: '79 St', lat: 40.7836, lng: -73.9797, lines: ['1'] },
            { id: '119', name: '72 St', lat: 40.7781, lng: -73.9822, lines: ['1', '2', '3'] },
            { id: '120', name: '66 St-Lincoln Center', lat: 40.7739, lng: -73.9822, lines: ['1'] },
            { id: '121', name: '59 St-Columbus Circle', lat: 40.7685, lng: -73.9819, lines: ['1', 'A', 'B', 'C', 'D'] },
            { id: '122', name: '50 St', lat: 40.7612, lng: -73.9836, lines: ['1'] },
            { id: '123', name: '42 St-Times Sq', lat: 40.7557, lng: -73.9869, lines: ['1', '2', '3', 'N', 'Q', 'R', 'W', '7'] },
            { id: '124', name: '34 St-Penn Station', lat: 40.7506, lng: -73.9930, lines: ['1', '2', '3'] },
            { id: '125', name: '28 St', lat: 40.7474, lng: -73.9946, lines: ['1'] },
            { id: '126', name: '23 St', lat: 40.7429, lng: -73.9928, lines: ['1'] },
            { id: '127', name: '18 St', lat: 40.7400, lng: -73.9975, lines: ['1'] },
            { id: '128', name: '14 St', lat: 40.7373, lng: -74.0000, lines: ['1', '2', '3'] },
            { id: '129', name: 'Christopher St-Sheridan Sq', lat: 40.7333, lng: -74.0026, lines: ['1'] },
            { id: '130', name: 'Houston St', lat: 40.7282, lng: -74.0054, lines: ['1'] },
            { id: '131', name: 'Canal St', lat: 40.7226, lng: -74.0057, lines: ['1', '2', 'A', 'C', 'E'] },
            { id: '132', name: 'Franklin St', lat: 40.7187, lng: -74.0077, lines: ['1'] },
            { id: '133', name: 'Chambers St', lat: 40.7152, lng: -74.0089, lines: ['1', '2', '3'] },
            { id: '134', name: 'Cortlandt St-WTC', lat: 40.7113, lng: -74.0123, lines: ['1'] },
            { id: '135', name: 'Rector St', lat: 40.7077, lng: -74.0135, lines: ['1'] },
            { id: '136', name: 'South Ferry', lat: 40.7016, lng: -74.0133, lines: ['1'] },
            // 2/3 only
            { id: '201', name: 'Wakefield-241 St', lat: 40.9035, lng: -73.8493, lines: ['2'] },
            { id: '204', name: 'Nereid Av', lat: 40.8984, lng: -73.8524, lines: ['2'] },
            { id: '205', name: '233 St', lat: 40.8954, lng: -73.8561, lines: ['2'] },
            { id: '206', name: '225 St', lat: 40.8888, lng: -73.8613, lines: ['2'] },
            { id: '207', name: 'White Plains Rd-222 St', lat: 40.8850, lng: -73.8654, lines: ['2'] },
            { id: '208', name: 'Gun Hill Rd', lat: 40.8775, lng: -73.8690, lines: ['2', '5'] },
            { id: '209', name: 'Burke Av', lat: 40.8713, lng: -73.8679, lines: ['2'] },
            { id: '210', name: 'Allerton Av', lat: 40.8657, lng: -73.8675, lines: ['2'] },
            { id: '211', name: 'Pelham Pkwy', lat: 40.8574, lng: -73.8675, lines: ['2', '5'] },
            { id: '212', name: 'Bronx Park East', lat: 40.8532, lng: -73.8675, lines: ['2'] },
            { id: '213', name: 'E Tremont Av', lat: 40.8479, lng: -73.8712, lines: ['2'] },
            { id: '214', name: 'West Farms Sq-E Tremont Av', lat: 40.8406, lng: -73.8796, lines: ['2'] },
            { id: '215', name: 'Freeman St', lat: 40.8295, lng: -73.8916, lines: ['2'] },
            { id: '216', name: 'Simpson St', lat: 40.8259, lng: -73.8936, lines: ['2'] },
            { id: '217', name: 'Intervale Av', lat: 40.8224, lng: -73.8961, lines: ['2'] },
            { id: '218', name: 'Prospect Av', lat: 40.8192, lng: -73.9005, lines: ['2'] },
            { id: '219', name: 'Jackson Av', lat: 40.8162, lng: -73.9077, lines: ['2'] },
            { id: '220', name: '3 Av-149 St', lat: 40.8162, lng: -73.9168, lines: ['2'] },
            { id: '221', name: '149 St-Grand Concourse', lat: 40.8189, lng: -73.9269, lines: ['2', '4', '5'] },
            { id: '222', name: '135 St', lat: 40.8140, lng: -73.9416, lines: ['2', '3'] },
            { id: '223', name: '125 St', lat: 40.8082, lng: -73.9456, lines: ['2', '3'] },
            { id: '224', name: '116 St', lat: 40.8020, lng: -73.9499, lines: ['2', '3'] },
            { id: '225', name: 'Central Park North-110 St', lat: 40.7996, lng: -73.9519, lines: ['2', '3'] },
            // 2/3 Brooklyn
            { id: '226', name: 'Clark St', lat: 40.6979, lng: -74.0019, lines: ['2', '3'] },
            { id: '227', name: 'Borough Hall', lat: 40.6930, lng: -73.9897, lines: ['2', '3', '4', '5'] },
            { id: '228', name: 'Hoyt St', lat: 40.6905, lng: -73.9848, lines: ['2', '3'] },
            { id: '229', name: 'Nevins St', lat: 40.6886, lng: -73.9805, lines: ['2', '3', '4', '5'] },
            { id: '230', name: 'Bergen St', lat: 40.6808, lng: -73.9752, lines: ['2', '3'] },
            { id: '231', name: 'Grand Army Plaza', lat: 40.6753, lng: -73.9714, lines: ['2', '3'] },
            { id: '232', name: 'Eastern Pkwy-Brooklyn Museum', lat: 40.6712, lng: -73.9640, lines: ['2', '3'] },
            { id: '233', name: 'Franklin Av', lat: 40.6719, lng: -73.9582, lines: ['2', '3', '4', '5'] },
            { id: '234', name: 'Nostrand Av', lat: 40.6699, lng: -73.9502, lines: ['2', '3'] },
            { id: '235', name: 'Kingston Av', lat: 40.6688, lng: -73.9413, lines: ['3'] },
            { id: '236', name: 'Crown Hts-Utica Av', lat: 40.6690, lng: -73.9328, lines: ['2', '3', '4'] },
            { id: '237', name: 'New Lots Av', lat: 40.6587, lng: -73.9000, lines: ['3'] },
            { id: '238', name: 'Flatbush Av-Brooklyn College', lat: 40.6448, lng: -73.9447, lines: ['2', '5'] },
            // 4/5/6
            { id: '401', name: 'Woodlawn', lat: 40.8867, lng: -73.8788, lines: ['4'] },
            { id: '402', name: 'Mosholu Pkwy', lat: 40.8795, lng: -73.8824, lines: ['4'] },
            { id: '403', name: 'Norwood-205 St', lat: 40.8748, lng: -73.8781, lines: ['D'] },
            { id: '405', name: 'Bedford Park Blvd-Lehman College', lat: 40.8733, lng: -73.8905, lines: ['4'] },
            { id: '406', name: 'Kingsbridge Rd', lat: 40.8653, lng: -73.8981, lines: ['4'] },
            { id: '407', name: 'Fordham Rd', lat: 40.8607, lng: -73.9001, lines: ['4'] },
            { id: '408', name: 'E 180 St', lat: 40.8527, lng: -73.8935, lines: ['2', '5'] },
            { id: '409', name: '174-175 Sts', lat: 40.8474, lng: -73.9019, lines: ['B', 'D'] },
            { id: '410', name: 'Mt Eden Av', lat: 40.8444, lng: -73.9107, lines: ['4'] },
            { id: '411', name: '170 St', lat: 40.8399, lng: -73.9172, lines: ['4'] },
            { id: '412', name: '167 St', lat: 40.8357, lng: -73.9209, lines: ['4'] },
            { id: '413', name: '161 St-Yankee Stadium', lat: 40.8278, lng: -73.9255, lines: ['4', 'B', 'D'] },
            { id: '414', name: '149 St-Grand Concourse', lat: 40.8189, lng: -73.9269, lines: ['4'] },
            { id: '415', name: '138 St-Grand Concourse', lat: 40.8132, lng: -73.9356, lines: ['4', '5'] },
            { id: '416', name: '125 St', lat: 40.8042, lng: -73.9377, lines: ['4', '5', '6'] },
            { id: '417', name: '116 St', lat: 40.7962, lng: -73.9387, lines: ['6'] },
            { id: '418', name: '110 St', lat: 40.7921, lng: -73.9386, lines: ['6'] },
            { id: '419', name: '103 St', lat: 40.7881, lng: -73.9464, lines: ['6'] },
            { id: '420', name: '96 St', lat: 40.7847, lng: -73.9481, lines: ['6'] },
            { id: '421', name: '86 St', lat: 40.7774, lng: -73.9556, lines: ['4', '5', '6'] },
            { id: '422', name: '77 St', lat: 40.7736, lng: -73.9586, lines: ['6'] },
            { id: '423', name: '68 St-Hunter College', lat: 40.7686, lng: -73.9643, lines: ['6'] },
            { id: '424', name: '59 St', lat: 40.7647, lng: -73.9678, lines: ['4', '5', '6'] },
            { id: '425', name: '51 St', lat: 40.7573, lng: -73.9726, lines: ['6'] },
            { id: '426', name: '42 St-Grand Central', lat: 40.7527, lng: -73.9772, lines: ['4', '5', '6', '7', 'S'] },
            { id: '427', name: '33 St', lat: 40.7466, lng: -73.9839, lines: ['6'] },
            { id: '428', name: '28 St', lat: 40.7440, lng: -73.9834, lines: ['6'] },
            { id: '429', name: '23 St', lat: 40.7396, lng: -73.9861, lines: ['6'] },
            { id: '430', name: '14 St-Union Sq', lat: 40.7353, lng: -73.9903, lines: ['4', '5', '6', 'L', 'N', 'Q', 'R', 'W'] },
            { id: '431', name: 'Astor Pl', lat: 40.7301, lng: -73.9908, lines: ['6'] },
            { id: '432', name: 'Bleecker St', lat: 40.7258, lng: -73.9941, lines: ['6'] },
            { id: '433', name: 'Spring St', lat: 40.7223, lng: -73.9972, lines: ['6'] },
            { id: '434', name: 'Canal St', lat: 40.7188, lng: -74.0000, lines: ['4', '5', '6'] },
            { id: '435', name: 'Brooklyn Bridge-City Hall', lat: 40.7134, lng: -74.0040, lines: ['4', '5', '6'] },
            // A/C/E
            { id: 'A01', name: 'Inwood-207 St', lat: 40.8680, lng: -73.9201, lines: ['A'] },
            { id: 'A02', name: '207 St', lat: 40.8645, lng: -73.9239, lines: ['A'] },
            { id: 'A03', name: '190 St', lat: 40.8594, lng: -73.9297, lines: ['A'] },
            { id: 'A04', name: '181 St', lat: 40.8558, lng: -73.9332, lines: ['A'] },
            { id: 'A05', name: '175 St', lat: 40.8474, lng: -73.9392, lines: ['A'] },
            { id: 'A06', name: '168 St', lat: 40.8402, lng: -73.9394, lines: ['A', 'C'] },
            { id: 'A07', name: '163 St-Amsterdam Av', lat: 40.8361, lng: -73.9393, lines: ['C'] },
            { id: 'A08', name: '155 St', lat: 40.8308, lng: -73.9415, lines: ['C'] },
            { id: 'A09', name: '145 St', lat: 40.8265, lng: -73.9444, lines: ['A', 'C'] },
            { id: 'A10', name: '135 St', lat: 40.8195, lng: -73.9496, lines: ['B', 'C'] },
            { id: 'A11', name: '125 St', lat: 40.8113, lng: -73.9525, lines: ['A', 'B', 'C', 'D'] },
            { id: 'A12', name: '116 St', lat: 40.8041, lng: -73.9556, lines: ['C'] },
            { id: 'A13', name: '110 St-Cathedral Pkwy', lat: 40.8002, lng: -73.9572, lines: ['B', 'C'] },
            { id: 'A14', name: '103 St', lat: 40.7961, lng: -73.9613, lines: ['B', 'C'] },
            { id: 'A15', name: '96 St', lat: 40.7920, lng: -73.9629, lines: ['B', 'C'] },
            { id: 'A16', name: '86 St', lat: 40.7855, lng: -73.9665, lines: ['B', 'C'] },
            { id: 'A17', name: '81 St-Museum of Natural History', lat: 40.7813, lng: -73.9697, lines: ['B', 'C'] },
            { id: 'A18', name: '72 St', lat: 40.7759, lng: -73.9741, lines: ['B', 'C'] },
            { id: 'A19', name: '59 St-Columbus Circle', lat: 40.7685, lng: -73.9820, lines: ['A', 'B', 'C', 'D'] },
            { id: 'A20', name: '50 St', lat: 40.7621, lng: -73.9836, lines: ['C', 'E'] },
            { id: 'A21', name: '42 St-Port Authority', lat: 40.7569, lng: -73.9896, lines: ['A', 'C', 'E'] },
            { id: 'A22', name: '34 St-Penn Station', lat: 40.7506, lng: -73.9971, lines: ['A', 'C', 'E'] },
            { id: 'A23', name: '23 St', lat: 40.7446, lng: -74.0011, lines: ['C', 'E'] },
            { id: 'A24', name: '14 St', lat: 40.7401, lng: -74.0035, lines: ['A', 'C', 'E'] },
            { id: 'A25', name: 'West 4 St-Washington Sq', lat: 40.7323, lng: -74.0006, lines: ['A', 'B', 'C', 'D', 'E', 'F', 'M'] },
            { id: 'A26', name: 'Spring St', lat: 40.7262, lng: -74.0034, lines: ['C', 'E'] },
            { id: 'A27', name: 'Canal St', lat: 40.7226, lng: -74.0053, lines: ['A', 'C', 'E'] },
            { id: 'A28', name: 'Chambers St', lat: 40.7131, lng: -74.0093, lines: ['A', 'C'] },
            { id: 'A29', name: 'Fulton St', lat: 40.7098, lng: -74.0099, lines: ['A', 'C'] },
            { id: 'A30', name: 'High St', lat: 40.6992, lng: -73.9904, lines: ['A', 'C'] },
            { id: 'A31', name: 'Jay St-MetroTech', lat: 40.6925, lng: -73.9872, lines: ['A', 'C', 'F', 'R'] },
            { id: 'A32', name: 'Hoyt-Schermerhorn Sts', lat: 40.6882, lng: -73.9851, lines: ['A', 'C', 'G'] },
            { id: 'A32b', name: 'Lafayette Av', lat: 40.6861, lng: -73.9738, lines: ['C'] },
            { id: 'A33', name: 'Nostrand Av', lat: 40.6698, lng: -73.9503, lines: ['A', 'C'] },
            { id: 'A34', name: 'Kingston-Throop Avs', lat: 40.6799, lng: -73.9407, lines: ['C'] },
            { id: 'A35', name: 'Ralph Av', lat: 40.6785, lng: -73.9187, lines: ['A', 'C'] },
            { id: 'A36', name: 'Rockaway Av', lat: 40.6641, lng: -73.9124, lines: ['A', 'C'] },
            { id: 'A38', name: 'Broadway Junction', lat: 40.6784, lng: -73.9050, lines: ['A', 'C', 'J', 'L', 'Z'] },
            { id: 'A40', name: 'Far Rockaway-Mott Av', lat: 40.6033, lng: -73.7554, lines: ['A'] },
            // B/D/F/M
            { id: 'D01', name: 'Norwood-205 St', lat: 40.8748, lng: -73.8781, lines: ['D'] },
            { id: 'D03', name: 'Bedford Park Blvd', lat: 40.8731, lng: -73.8830, lines: ['B', 'D'] },
            { id: 'D04', name: 'Kingsbridge Rd', lat: 40.8660, lng: -73.8977, lines: ['D'] },
            { id: 'D05', name: 'Fordham Rd', lat: 40.8612, lng: -73.8997, lines: ['B', 'D'] },
            { id: 'D06', name: '182-183 Sts', lat: 40.8561, lng: -73.9010, lines: ['D'] },
            { id: 'D07', name: 'Tremont Av', lat: 40.8501, lng: -73.9059, lines: ['B', 'D'] },
            { id: 'D08', name: '174-175 Sts', lat: 40.8474, lng: -73.9019, lines: ['B', 'D'] },
            { id: 'D09', name: '170 St', lat: 40.8419, lng: -73.9138, lines: ['B', 'D'] },
            { id: 'D10', name: '167 St', lat: 40.8357, lng: -73.9209, lines: ['B', 'D'] },
            { id: 'D11', name: '161 St-Yankee Stadium', lat: 40.8278, lng: -73.9255, lines: ['B', 'D'] },
            { id: 'D12', name: '155 St', lat: 40.8296, lng: -73.9381, lines: ['B', 'D'] },
            { id: 'D13', name: '145 St', lat: 40.8247, lng: -73.9403, lines: ['B', 'D'] },
            { id: 'D14', name: 'Fordham Rd-Grand Concourse', lat: 40.8612, lng: -73.8997, lines: ['B'] },
            { id: 'D15', name: '47-50 Sts-Rockefeller Ctr', lat: 40.7586, lng: -73.9810, lines: ['B', 'D', 'F', 'M'] },
            { id: 'D16', name: '42 St-Bryant Park', lat: 40.7541, lng: -73.9842, lines: ['B', 'D', 'F', 'M'] },
            { id: 'D17', name: '34 St-Herald Sq', lat: 40.7497, lng: -73.9880, lines: ['B', 'D', 'F', 'M', 'N', 'Q', 'R', 'W'] },
            { id: 'D18', name: '23 St', lat: 40.7428, lng: -73.9923, lines: ['F', 'M'] },
            { id: 'D19', name: '14 St', lat: 40.7381, lng: -73.9962, lines: ['F', 'M'] },
            { id: 'D20', name: 'West 4 St-Washington Sq', lat: 40.7323, lng: -74.0006, lines: ['A', 'B', 'C', 'D', 'E', 'F', 'M'] },
            { id: 'D21', name: 'Broadway-Lafayette St', lat: 40.7256, lng: -73.9964, lines: ['B', 'D', 'F', 'M'] },
            { id: 'D22', name: 'Grand St', lat: 40.7168, lng: -73.9941, lines: ['B', 'D'] },
            { id: 'D24', name: 'Atlantic Av-Barclays Ctr', lat: 40.6844, lng: -73.9772, lines: ['B', 'D', 'N', 'Q', 'R', '2', '3', '4', '5'] },
            { id: 'D25', name: '7 Av', lat: 40.6770, lng: -73.9722, lines: ['B', 'Q'] },
            { id: 'D26', name: 'Prospect Park', lat: 40.6617, lng: -73.9617, lines: ['B', 'Q'] },
            { id: 'D27', name: 'Parkside Av', lat: 40.6553, lng: -73.9609, lines: ['Q'] },
            { id: 'D28', name: 'Church Av', lat: 40.6507, lng: -73.9628, lines: ['B', 'Q'] },
            { id: 'D40', name: 'Coney Island-Stillwell Av', lat: 40.5774, lng: -73.9815, lines: ['D', 'F', 'N', 'Q'] },
            // F/M Queens
            { id: 'F01', name: 'Jamaica-179 St', lat: 40.7125, lng: -73.7902, lines: ['F'] },
            { id: 'F02', name: '169 St', lat: 40.7138, lng: -73.7966, lines: ['F'] },
            { id: 'F03', name: 'Parsons Blvd', lat: 40.7025, lng: -73.8033, lines: ['F'] },
            { id: 'F04', name: 'Sutphin Blvd', lat: 40.7007, lng: -73.8070, lines: ['F'] },
            { id: 'F05', name: 'Briarwood', lat: 40.7087, lng: -73.8204, lines: ['E', 'F'] },
            { id: 'F06', name: 'Kew Gardens-Union Tpke', lat: 40.7145, lng: -73.8316, lines: ['E', 'F'] },
            { id: 'F07', name: 'Forest Hills-71 Av', lat: 40.7218, lng: -73.8446, lines: ['E', 'F', 'M', 'R'] },
            { id: 'F08', name: '67 Av', lat: 40.7229, lng: -73.8549, lines: ['M', 'R'] },
            { id: 'F09', name: '63 Dr-Rego Park', lat: 40.7229, lng: -73.8617, lines: ['M', 'R'] },
            { id: 'F10', name: 'Woodhaven Blvd', lat: 40.7332, lng: -73.8599, lines: ['M', 'R'] },
            { id: 'F11', name: 'Jackson Hts-Roosevelt Av', lat: 40.7467, lng: -73.8913, lines: ['E', 'F', 'M', 'R', '7'] },
            { id: 'F12', name: '65 St', lat: 40.7499, lng: -73.8982, lines: ['M', 'R'] },
            { id: 'F13', name: 'Northern Blvd', lat: 40.7520, lng: -73.9036, lines: ['M', 'R'] },
            { id: 'F14', name: '46 St', lat: 40.7541, lng: -73.9086, lines: ['M', 'R'] },
            { id: 'F15', name: 'Steinway St', lat: 40.7560, lng: -73.9129, lines: ['M', 'R'] },
            { id: 'F16', name: '36 St', lat: 40.7523, lng: -73.9201, lines: ['M', 'R'] },
            { id: 'F17', name: 'Queens Plaza', lat: 40.7488, lng: -73.9336, lines: ['E', 'M', 'R'] },
            { id: 'F18', name: 'Court Sq-23 St', lat: 40.7472, lng: -73.9454, lines: ['E', 'M', 'G'] },
            // G train
            { id: 'G01', name: 'Court Sq', lat: 40.7472, lng: -73.9454, lines: ['G'] },
            { id: 'G02', name: 'Greenpoint Av', lat: 40.7310, lng: -73.9544, lines: ['G'] },
            { id: 'G03', name: 'Nassau Av', lat: 40.7240, lng: -73.9511, lines: ['G'] },
            { id: 'G04', name: 'Metropolitan Av', lat: 40.7144, lng: -73.9515, lines: ['G', 'M'] },
            { id: 'G05', name: 'Broadway', lat: 40.7062, lng: -73.9502, lines: ['G', 'J', 'M', 'Z'] },
            { id: 'G06', name: 'Flushing Av', lat: 40.7001, lng: -73.9506, lines: ['G'] },
            { id: 'G07', name: 'Myrtle-Willoughby Avs', lat: 40.6942, lng: -73.9499, lines: ['G'] },
            { id: 'G08', name: 'Bedford-Nostrand Avs', lat: 40.6896, lng: -73.9533, lines: ['G'] },
            { id: 'G09', name: 'Classon Av', lat: 40.6882, lng: -73.9612, lines: ['G'] },
            { id: 'G10', name: 'Clinton-Washington Avs', lat: 40.6882, lng: -73.9667, lines: ['C', 'G'] },
            { id: 'G11', name: 'Fulton St', lat: 40.6876, lng: -73.9751, lines: ['G'] },
            { id: 'G12', name: 'Bergen St', lat: 40.6861, lng: -73.9906, lines: ['F', 'G'] },
            { id: 'G13', name: 'Carroll St', lat: 40.6802, lng: -73.9953, lines: ['F', 'G'] },
            { id: 'G14', name: 'Smith-9 Sts', lat: 40.6736, lng: -73.9981, lines: ['F', 'G'] },
            { id: 'G15', name: '4 Av-9 St', lat: 40.6704, lng: -73.9893, lines: ['F', 'G', 'R'] },
            { id: 'G16', name: '7 Av', lat: 40.6661, lng: -73.9791, lines: ['F', 'G'] },
            { id: 'G17', name: '15 St-Prospect Park', lat: 40.6601, lng: -73.9791, lines: ['F', 'G'] },
            { id: 'G18', name: 'Fort Hamilton Pkwy', lat: 40.6504, lng: -73.9750, lines: ['F', 'G'] },
            { id: 'G19', name: 'Church Av', lat: 40.6446, lng: -73.9793, lines: ['F', 'G'] },
            // J/Z
            { id: 'J01', name: 'Jamaica Center-Parsons-Archer', lat: 40.7025, lng: -73.8009, lines: ['E', 'J', 'Z'] },
            { id: 'J02', name: 'Sutphin Blvd-Archer Av', lat: 40.7007, lng: -73.8070, lines: ['E', 'J', 'Z'] },
            { id: 'J03', name: 'Jamaica-Van Wyck', lat: 40.7021, lng: -73.8161, lines: ['E'] },
            { id: 'J04', name: '121 St', lat: 40.7006, lng: -73.8276, lines: ['J', 'Z'] },
            { id: 'J05', name: '111 St', lat: 40.6993, lng: -73.8369, lines: ['J'] },
            { id: 'J06', name: '104 St', lat: 40.6978, lng: -73.8474, lines: ['J', 'Z'] },
            { id: 'J07', name: 'Woodhaven Blvd', lat: 40.6961, lng: -73.8590, lines: ['J', 'Z'] },
            { id: 'J08', name: '85 St-Forest Pkwy', lat: 40.6946, lng: -73.8700, lines: ['J'] },
            { id: 'J09', name: '75 St-Elderts Ln', lat: 40.6919, lng: -73.8802, lines: ['J', 'Z'] },
            { id: 'J10', name: 'Cypress Hills', lat: 40.6891, lng: -73.8889, lines: ['J'] },
            { id: 'J11', name: 'Norwood Av', lat: 40.6883, lng: -73.8968, lines: ['J', 'Z'] },
            { id: 'J12', name: 'Cleveland St', lat: 40.6869, lng: -73.9042, lines: ['J'] },
            { id: 'J13', name: 'Crescent St', lat: 40.6847, lng: -73.9122, lines: ['J', 'Z'] },
            { id: 'J14', name: 'Halsey St', lat: 40.6832, lng: -73.9185, lines: ['J'] },
            { id: 'J15', name: 'Gates Av', lat: 40.6891, lng: -73.9226, lines: ['J', 'Z'] },
            { id: 'J16', name: 'Kosciuszko St', lat: 40.6938, lng: -73.9292, lines: ['J'] },
            { id: 'J17', name: 'Myrtle Av', lat: 40.6976, lng: -73.9358, lines: ['J', 'M', 'Z'] },
            // L train
            { id: 'L01', name: '8 Av', lat: 40.7392, lng: -74.0027, lines: ['L'] },
            { id: 'L02', name: '6 Av', lat: 40.7378, lng: -73.9963, lines: ['L'] },
            { id: 'L03', name: '14 St-Union Sq', lat: 40.7353, lng: -73.9903, lines: ['L', '4', '5', '6', 'N', 'Q', 'R', 'W'] },
            { id: 'L04', name: '3 Av', lat: 40.7325, lng: -73.9862, lines: ['L'] },
            { id: 'L05', name: '1 Av', lat: 40.7301, lng: -73.9815, lines: ['L'] },
            { id: 'L06', name: 'Bedford Av', lat: 40.7172, lng: -73.9563, lines: ['L'] },
            { id: 'L07', name: 'Lorimer St', lat: 40.7144, lng: -73.9503, lines: ['L'] },
            { id: 'L08', name: 'Graham Av', lat: 40.7144, lng: -73.9444, lines: ['L'] },
            { id: 'L09', name: 'Grand St', lat: 40.7114, lng: -73.9394, lines: ['L'] },
            { id: 'L10', name: 'Montrose Av', lat: 40.7079, lng: -73.9398, lines: ['L'] },
            { id: 'L11', name: 'Morgan Av', lat: 40.7061, lng: -73.9334, lines: ['L'] },
            { id: 'L12', name: 'Jefferson St', lat: 40.7061, lng: -73.9225, lines: ['L'] },
            { id: 'L13', name: 'DeKalb Av', lat: 40.7032, lng: -73.9184, lines: ['L'] },
            { id: 'L14', name: 'Myrtle-Wyckoff Avs', lat: 40.6996, lng: -73.9114, lines: ['L', 'M'] },
            { id: 'L15', name: 'Halsey St', lat: 40.6963, lng: -73.9045, lines: ['L'] },
            { id: 'L16', name: 'Wilson Av', lat: 40.6888, lng: -73.9045, lines: ['L'] },
            { id: 'L17', name: 'Bushwick Av-Aberdeen St', lat: 40.6847, lng: -73.9055, lines: ['L'] },
            { id: 'L18', name: 'Broadway Junction', lat: 40.6784, lng: -73.9050, lines: ['A', 'C', 'J', 'L', 'Z'] },
            { id: 'L19', name: 'Atlantic Av', lat: 40.6758, lng: -73.9036, lines: ['L'] },
            { id: 'L20', name: 'Sutter Av', lat: 40.6697, lng: -73.9014, lines: ['L'] },
            { id: 'L21', name: 'Livonia Av', lat: 40.6641, lng: -73.9004, lines: ['L'] },
            { id: 'L22', name: 'New Lots Av', lat: 40.6586, lng: -73.9007, lines: ['L'] },
            { id: 'L23', name: 'East 105 St', lat: 40.6531, lng: -73.8988, lines: ['L'] },
            { id: 'L24', name: 'Canarsie-Rockaway Pkwy', lat: 40.6469, lng: -73.9021, lines: ['L'] },
            // N/Q/R/W
            { id: 'N01', name: 'Astoria-Ditmars Blvd', lat: 40.7754, lng: -73.9125, lines: ['N', 'W'] },
            { id: 'N02', name: 'Astoria Blvd', lat: 40.7700, lng: -73.9273, lines: ['N', 'W'] },
            { id: 'N03', name: '30 Av', lat: 40.7666, lng: -73.9300, lines: ['N', 'W'] },
            { id: 'N04', name: 'Broadway', lat: 40.7613, lng: -73.9286, lines: ['N', 'W'] },
            { id: 'N05', name: '36 Av', lat: 40.7562, lng: -73.9298, lines: ['N', 'W'] },
            { id: 'N06', name: 'Queensboro Plaza', lat: 40.7504, lng: -73.9403, lines: ['N', 'W', '7'] },
            { id: 'N07', name: 'Lexington Av-59 St', lat: 40.7627, lng: -73.9673, lines: ['N', 'Q', 'R', 'W', '4', '5', '6'] },
            { id: 'N08', name: '5 Av-59 St', lat: 40.7643, lng: -73.9734, lines: ['N', 'Q', 'R', 'W'] },
            { id: 'N09', name: '57 St-7 Av', lat: 40.7637, lng: -73.9798, lines: ['N', 'Q', 'R', 'W'] },
            { id: 'N10', name: '49 St', lat: 40.7596, lng: -73.9840, lines: ['N', 'Q', 'R', 'W'] },
            { id: 'N11', name: 'Times Sq-42 St', lat: 40.7557, lng: -73.9869, lines: ['N', 'Q', 'R', 'W', '1', '2', '3', '7'] },
            { id: 'N12', name: '34 St-Herald Sq', lat: 40.7497, lng: -73.9880, lines: ['B', 'D', 'F', 'M', 'N', 'Q', 'R', 'W'] },
            { id: 'N13', name: '28 St', lat: 40.7450, lng: -73.9888, lines: ['N', 'R', 'W'] },
            { id: 'N14', name: '23 St', lat: 40.7407, lng: -73.9899, lines: ['N', 'R', 'W'] },
            { id: 'N15', name: '14 St-Union Sq', lat: 40.7353, lng: -73.9903, lines: ['N', 'Q', 'R', 'W', '4', '5', '6', 'L'] },
            { id: 'N16', name: '8 St-NYU', lat: 40.7307, lng: -73.9926, lines: ['N', 'R', 'W'] },
            { id: 'N17', name: 'Prince St', lat: 40.7243, lng: -73.9971, lines: ['N', 'R', 'W'] },
            { id: 'N18', name: 'Canal St', lat: 40.7187, lng: -74.0003, lines: ['N', 'Q', 'R', 'W'] },
            { id: 'N19', name: 'City Hall', lat: 40.7131, lng: -74.0076, lines: ['N', 'R', 'W'] },
            { id: 'N20', name: 'Cortlandt St', lat: 40.7113, lng: -74.0117, lines: ['N', 'R', 'W'] },
            { id: 'N21', name: 'Rector St', lat: 40.7076, lng: -74.0133, lines: ['N', 'R', 'W'] },
            { id: 'N22', name: 'Whitehall St-South Ferry', lat: 40.7032, lng: -74.0133, lines: ['N', 'R', 'W'] },
            { id: 'N23', name: 'Court St-Borough Hall', lat: 40.6941, lng: -73.9908, lines: ['N', 'R', 'W'] },
            { id: 'N24', name: 'Atlantic Av-Barclays Ctr', lat: 40.6844, lng: -73.9772, lines: ['B', 'D', 'N', 'Q', 'R'] },
            { id: 'N25', name: 'Union St', lat: 40.6775, lng: -73.9833, lines: ['R'] },
            { id: 'N26', name: '4 Av-9 St', lat: 40.6704, lng: -73.9893, lines: ['F', 'G', 'R'] },
            { id: 'N27', name: 'Bay Ridge Av', lat: 40.6613, lng: -74.0258, lines: ['R'] },
            { id: 'N28', name: 'Bay Ridge-95 St', lat: 40.6162, lng: -74.0304, lines: ['R'] },
            // 7 train
            { id: 'S01', name: 'Flushing-Main St', lat: 40.7597, lng: -73.8298, lines: ['7'] },
            { id: 'S02', name: 'Mets-Willets Point', lat: 40.7542, lng: -73.8455, lines: ['7'] },
            { id: 'S03', name: 'Junction Blvd', lat: 40.7498, lng: -73.8674, lines: ['7'] },
            { id: 'S04', name: 'Jackson Hts-Roosevelt Av', lat: 40.7467, lng: -73.8913, lines: ['7', 'E', 'F', 'M', 'R'] },
            { id: 'S05', name: '74 St-Broadway', lat: 40.7467, lng: -73.8913, lines: ['7'] },
            { id: 'S06', name: '82 St-Jackson Hts', lat: 40.7476, lng: -73.8833, lines: ['7'] },
            { id: 'S07', name: '90 St-Elmhurst Av', lat: 40.7484, lng: -73.8769, lines: ['7'] },
            { id: 'S08', name: 'Queensboro Plaza', lat: 40.7504, lng: -73.9403, lines: ['7', 'N', 'W'] },
            { id: 'S09', name: 'Court Sq', lat: 40.7472, lng: -73.9454, lines: ['7', 'E', 'M', 'G'] },
            { id: 'S10', name: 'Hudson Yards', lat: 40.7541, lng: -74.0020, lines: ['7'] },
            // Staten Island
            { id: 'SI01', name: 'St George', lat: 40.6437, lng: -74.0735, lines: ['SIR'] },
            { id: 'SI02', name: 'Tompkinsville', lat: 40.6363, lng: -74.0739, lines: ['SIR'] },
            { id: 'SI03', name: 'Stapleton', lat: 40.6276, lng: -74.0750, lines: ['SIR'] },
        ];
    }

    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                position => {
                    this.currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    resolve(this.currentLocation);
                },
                error => reject(error),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
            );
        });
    }

    startWatching(callback) {
        if (!navigator.geolocation) return;
        this.watchId = navigator.geolocation.watchPosition(
            position => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                callback(this.currentLocation);
            },
            error => console.error('Location watch error:', error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    }

    stopWatching() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    getNearbyStations(maxDistance = 0.5) {
        if (!this.currentLocation) return [];
        return this.stations
            .map(station => ({
                ...station,
                distance: this.calculateDistance(
                    this.currentLocation.lat, this.currentLocation.lng,
                    station.lat, station.lng
                )
            }))
            .filter(station => station.distance <= maxDistance)
            .sort((a, b) => a.distance - b.distance);
    }

    getClosestStation() {
        const nearby = this.getNearbyStations(2.0);
        return nearby.length > 0 ? nearby[0] : null;
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 3959;
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    toRad(degrees) { return degrees * (Math.PI / 180); }

    getStationById(stationId) { return this.stations.find(s => s.id === stationId); }

    getStationsByLine(line) { return this.stations.filter(s => s.lines.includes(line)); }

    inferLine(station) {
        if (!station?.lines?.length) return null;
        return station.lines[0];
    }
}

const locationService = new LocationService();
