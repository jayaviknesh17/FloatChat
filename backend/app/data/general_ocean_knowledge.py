"""
General Ocean Knowledge Base for FloatChat.
Contains 150 curated Q&A pairs across 8 categories:
A. Ocean Geography (25)
B. Indian Ocean / Indian Geography (20)
C. Arabian Sea / Bay of Bengal (20)
D. Ocean Science Basics (25)
E. Temperature / Salinity / Density (15)
F. ARGO / Profiling Floats (15)
G. Climate / Marine Environment (15)
H. Ocean Exploration / Technology (15)
"""

OCEAN_KNOWLEDGE_BASE = [
    # =========================================================================
    # A. OCEAN GEOGRAPHY (25)
    # =========================================================================
    {
        "id": "geo_01",
        "category": "Ocean Geography",
        "question": "where is pacific ocean",
        "answer": "The Pacific Ocean is the largest and deepest ocean on Earth. It extends from the Arctic Ocean in the north to the Southern Ocean in the south, bounded by Asia and Australia to the west and the Americas to the east.",
        "keywords": ["pacific ocean", "pacific", "where is pacific", "pacific location", "biggest ocean"]
    },
    {
        "id": "geo_02",
        "category": "Ocean Geography",
        "question": "where is atlantic ocean",
        "answer": "The Atlantic Ocean is the second-largest ocean, separating the Americas from Europe and Africa. It connects to the Arctic Ocean in the north and the Southern Ocean in the south.",
        "keywords": ["atlantic ocean", "atlantic", "where is atlantic", "atlantic location"]
    },
    {
        "id": "geo_03",
        "category": "Ocean Geography",
        "question": "where is indian ocean located",
        "answer": "The Indian Ocean lies bounded by Asia to the north, Africa to the west, Australia to the east, and the Southern Ocean to the south. It includes major sub-basins like the Arabian Sea and Bay of Bengal.",
        "keywords": ["where is indian ocean", "indian ocean location", "indian ocean", "where is indian ocean located"]
    },
    {
        "id": "geo_04",
        "category": "Ocean Geography",
        "question": "where is arctic ocean",
        "answer": "The Arctic Ocean is the smallest and shallowest of the world's five major oceans, located around the North Pole in the Northern Hemisphere.",
        "keywords": ["arctic ocean", "arctic", "where is arctic", "north pole ocean"]
    },
    {
        "id": "geo_05",
        "category": "Ocean Geography",
        "question": "where is southern ocean",
        "answer": "The Southern Ocean (also known as the Antarctic Ocean) surrounds Antarctica and extends northwards to 60°S latitude, connecting the southern Atlantic, Pacific, and Indian Oceans.",
        "keywords": ["southern ocean", "antarctic ocean", "where is southern ocean"]
    },
    {
        "id": "geo_06",
        "category": "Ocean Geography",
        "question": "what is an ocean",
        "answer": "An ocean is a continuous body of saline water that covers over 70% of Earth's surface. Earth has five main interconnected ocean basins: Pacific, Atlantic, Indian, Southern, and Arctic.",
        "keywords": ["what is an ocean", "definition of ocean", "ocean meaning", "ocean definition"]
    },
    {
        "id": "geo_07",
        "category": "Ocean Geography",
        "question": "what is a sea",
        "answer": "A sea is a smaller body of salt water partially or fully enclosed by land, often forming part of a larger ocean. Examples include the Mediterranean Sea, Caribbean Sea, and Arabian Sea.",
        "keywords": ["what is a sea", "difference between sea and ocean", "sea definition", "sea meaning"]
    },
    {
        "id": "geo_08",
        "category": "Ocean Geography",
        "question": "where is mediterranean sea",
        "answer": "The Mediterranean Sea is connected to the Atlantic Ocean, surrounded by the Mediterranean Basin and almost completely enclosed by land: Europe to the north, North Africa to the south, and Western Asia to the east.",
        "keywords": ["mediterranean sea", "mediterranean", "where is mediterranean"]
    },
    {
        "id": "geo_09",
        "category": "Ocean Geography",
        "question": "where is caribbean sea",
        "answer": "The Caribbean Sea is a sub-oceanic basin of the western Atlantic Ocean in the tropics of the Western Hemisphere, bounded by North America, Central America, South America, and the Antilles islands.",
        "keywords": ["caribbean sea", "caribbean", "where is caribbean"]
    },
    {
        "id": "geo_10",
        "category": "Ocean Geography",
        "question": "where is red sea",
        "answer": "The Red Sea is a seawater inlet of the Indian Ocean lying between Africa and the Arabian Peninsula, connected to the ocean southwards through the Bab el-Mandeb strait and the Gulf of Aden.",
        "keywords": ["red sea", "where is red sea", "red sea location"]
    },
    {
        "id": "geo_11",
        "category": "Ocean Geography",
        "question": "where is persian gulf",
        "answer": "The Persian Gulf is a Mediterranean sea in Western Asia, connected to the Arabian Sea through the Strait of Hormuz and Gulf of Oman, lying between Iran and the Arabian Peninsula.",
        "keywords": ["persian gulf", "gulf of persia", "where is persian gulf"]
    },
    {
        "id": "geo_12",
        "category": "Ocean Geography",
        "question": "where is south china sea",
        "answer": "The South China Sea is a marginal sea of the Western Pacific Ocean, bounded by China, Taiwan, the Philippines, Malaysia, Brunei, Indonesia, and Vietnam.",
        "keywords": ["south china sea", "where is south china sea"]
    },
    {
        "id": "geo_13",
        "category": "Ocean Geography",
        "question": "where is coral sea",
        "answer": "The Coral Sea is a marginal sea of the South Pacific off the northeast coast of Queensland, Australia, famous for containing the Great Barrier Reef.",
        "keywords": ["coral sea", "where is coral sea", "great barrier reef sea"]
    },
    {
        "id": "geo_14",
        "category": "Ocean Geography",
        "question": "where is bering sea",
        "answer": "The Bering Sea is a marginal sea of the Northern Pacific Ocean, separated from the Gulf of Alaska by the Aleutian Peninsula and lying between Alaska and Russia.",
        "keywords": ["bering sea", "where is bering sea"]
    },
    {
        "id": "geo_15",
        "category": "Ocean Geography",
        "question": "what is mariana trench",
        "answer": "The Mariana Trench, located in the western Pacific Ocean east of the Philippines, is the deepest oceanic trench on Earth, reaching a maximum known depth of nearly 11,000 meters at Challenger Deep.",
        "keywords": ["mariana trench", "deepest place on earth", "challenger deep", "deepest trench"]
    },
    {
        "id": "geo_16",
        "category": "Ocean Geography",
        "question": "what is a gulf",
        "answer": "A gulf is a deep inlet of the sea almost surrounded by land, typically with a narrow mouth, such as the Gulf of Mexico, Gulf of Oman, or Gulf of Bengal.",
        "keywords": ["what is a gulf", "gulf definition", "gulf meaning"]
    },
    {
        "id": "geo_17",
        "category": "Ocean Geography",
        "question": "what is a bay",
        "answer": "A bay is a broad inlet of the sea where the land curves inward, typically smaller and less enclosed than a gulf, such as the Bay of Bengal or Hudson Bay.",
        "keywords": ["what is a bay", "bay definition", "bay meaning"]
    },
    {
        "id": "geo_18",
        "category": "Ocean Geography",
        "question": "what is a strait",
        "answer": "A strait is a naturally formed, narrow waterway that connects two larger bodies of water, such as the Strait of Malacca or the Strait of Gibraltar.",
        "keywords": ["what is a strait", "strait definition", "strait meaning"]
    },
    {
        "id": "geo_19",
        "category": "Ocean Geography",
        "question": "what is an archipelago",
        "answer": "An archipelago is an extensive group or chain of islands clustered together in an ocean or sea, such as the Andaman & Nicobar Islands, Lakshadweep, or Indonesia.",
        "keywords": ["archipelago", "what is an archipelago", "island chain"]
    },
    {
        "id": "geo_20",
        "category": "Ocean Geography",
        "question": "what is a continental shelf",
        "answer": "A continental shelf is a shallow, gently sloping submarine plain bordering a continent, extending from the coast to the continental slope where depths drop into the deep ocean.",
        "keywords": ["continental shelf", "shelf ocean", "continental margin"]
    },
    {
        "id": "geo_21",
        "category": "Ocean Geography",
        "question": "where is strait of malacca",
        "answer": "The Strait of Malacca is a narrow stretch of water between the Malay Peninsula and the Indonesian island of Sumatra, connecting the Indian Ocean to the Pacific Ocean.",
        "keywords": ["strait of malacca", "malacca strait", "where is malacca"]
    },
    {
        "id": "geo_22",
        "category": "Ocean Geography",
        "question": "where is strait of gibraltar",
        "answer": "The Strait of Gibraltar connects the Atlantic Ocean to the Mediterranean Sea and separates the Iberian Peninsula in Europe from Morocco in Africa.",
        "keywords": ["strait of gibraltar", "gibraltar strait", "where is gibraltar"]
    },
    {
        "id": "geo_23",
        "category": "Ocean Geography",
        "question": "what is an oceanic ridge",
        "answer": "An oceanic ridge (or mid-ocean ridge) is a continuous underwater mountain system formed by plate tectonics, where new oceanic crust is created by magma rising to the sea floor.",
        "keywords": ["oceanic ridge", "mid-ocean ridge", "underwater mountain"]
    },
    {
        "id": "geo_24",
        "category": "Ocean Geography",
        "question": "what is a sea trench",
        "answer": "A sea trench is a long, narrow, steep-sided depression in the ocean floor formed at convergent plate boundaries where one tectonic plate slides underneath another.",
        "keywords": ["sea trench", "ocean trench", "deepest sea floor"]
    },
    {
        "id": "geo_25",
        "category": "Ocean Geography",
        "question": "how many oceans are there",
        "answer": "Traditionally four ocean basins were recognized, but modern oceanographers and international bodies recognize five world oceans: Pacific, Atlantic, Indian, Southern (Antarctic), and Arctic.",
        "keywords": ["how many oceans", "number of oceans", "five oceans", "list of oceans"]
    },

    # =========================================================================
    # B. INDIAN OCEAN / INDIAN GEOGRAPHY (20)
    # =========================================================================
    {
        "id": "ind_01",
        "category": "Indian Ocean / Indian Geography",
        "question": "which ocean is nearby kanyakumari",
        "answer": "Kanyakumari is situated at the southernmost tip of mainland India, where three major water bodies meet: the Arabian Sea to the west, the Bay of Bengal to the east, and the Indian Ocean to the south.",
        "keywords": ["kanyakumari", "nearby kanyakumari", "near kanyakumari", "ocean near kanyakumari", "which ocean is nearby kanyakumari"]
    },
    {
        "id": "ind_02",
        "category": "Indian Ocean / Indian Geography",
        "question": "which ocean is nearby madurai",
        "answer": "Madurai is an inland city in southern Tamil Nadu, India. The nearest marine waters to Madurai are the Gulf of Mannar and the Bay of Bengal to the east (approx 130 km), and the Arabian Sea to the southwest.",
        "keywords": ["madurai", "nearby madurai", "near madurai", "ocean near madurai", "which ocean is nearby madurai", "madurai sea"]
    },
    {
        "id": "ind_03",
        "category": "Indian Ocean / Indian Geography",
        "question": "which sea is near chennai",
        "answer": "Chennai is located on the Coromandel Coast along the eastern border of South India, facing the Bay of Bengal.",
        "keywords": ["chennai", "near chennai", "sea near chennai", "ocean near chennai", "which sea is near chennai"]
    },
    {
        "id": "ind_04",
        "category": "Indian Ocean / Indian Geography",
        "question": "which sea is near mumbai",
        "answer": "Mumbai lies on the Konkan coast on the western shore of India, directly bordering the Arabian Sea.",
        "keywords": ["mumbai", "near mumbai", "sea near mumbai", "mumbai ocean", "which sea is near mumbai"]
    },
    {
        "id": "ind_05",
        "category": "Indian Ocean / Indian Geography",
        "question": "where is lakshadweep located",
        "answer": "Lakshadweep is a tropical archipelago of 36 atolls and coral reefs located in the Arabian Sea, about 200 to 440 km off the southwestern coast of Kerala, India.",
        "keywords": ["lakshadweep", "where is lakshadweep", "lakshadweep location"]
    },
    {
        "id": "ind_06",
        "category": "Indian Ocean / Indian Geography",
        "question": "where are andaman and nicobar islands located",
        "answer": "The Andaman and Nicobar Islands form an Indian archipelago located at the juncture of the Bay of Bengal and the Andaman Sea, north of Sumatra.",
        "keywords": ["andaman", "nicobar", "andaman and nicobar", "where is andaman"]
    },
    {
        "id": "ind_07",
        "category": "Indian Ocean / Indian Geography",
        "question": "what is gulf of mannar",
        "answer": "The Gulf of Mannar is a large shallow bay forming part of the Laccadive Sea in the Indian Ocean, lying between the southeastern tip of India and the western coast of Sri Lanka.",
        "keywords": ["gulf of mannar", "mannar gulf", "where is gulf of mannar"]
    },
    {
        "id": "ind_08",
        "category": "Indian Ocean / Indian Geography",
        "question": "what is palk strait",
        "answer": "Palk Strait is a narrow strait between the Tamil Nadu state of India and the Jaffna District of Sri Lanka, connecting the Bay of Bengal in the northeast with Palk Bay to the southwest.",
        "keywords": ["palk strait", "palk bay", "where is palk strait"]
    },
    {
        "id": "ind_09",
        "category": "Indian Ocean / Indian Geography",
        "question": "which sea is near kochi",
        "answer": "Kochi (Cochin) is a major port city on the southwest coast of India (Kerala), bordering the Arabian Sea and the Vembanad estuary.",
        "keywords": ["kochi", "cochin", "sea near kochi", "ocean near kochi"]
    },
    {
        "id": "ind_10",
        "category": "Indian Ocean / Indian Geography",
        "question": "which sea is near goa",
        "answer": "Goa is located on the western coast of India within the Konkan region, facing the Arabian Sea to the west.",
        "keywords": ["goa", "sea near goa", "ocean near goa"]
    },
    {
        "id": "ind_11",
        "category": "Indian Ocean / Indian Geography",
        "question": "which ocean is near sri lanka",
        "answer": "Sri Lanka is an island nation in the northern Indian Ocean, bounded by the Gulf of Mannar and Palk Strait to the northwest, the Bay of Bengal to the northeast, and the open Indian Ocean to the south.",
        "keywords": ["sri lanka", "ocean near sri lanka", "sea near sri lanka"]
    },
    {
        "id": "ind_12",
        "category": "Indian Ocean / Indian Geography",
        "question": "where is maldives located",
        "answer": "The Maldives is an archipelagic state located in the north-central Indian Ocean, southwest of India and Sri Lanka.",
        "keywords": ["maldives", "where is maldives", "maldives location"]
    },
    {
        "id": "ind_13",
        "category": "Indian Ocean / Indian Geography",
        "question": "what is the Indian Ocean Dipole",
        "answer": "The Indian Ocean Dipole (IOD) is a climate pattern caused by a difference in sea surface temperatures between the western Indian Ocean (Arabian Sea) and eastern Indian Ocean (near Indonesia), influencing monsoons across South Asia.",
        "keywords": ["indian ocean dipole", "iod", "what is iod", "indian ocean dipole definition"]
    },
    {
        "id": "ind_14",
        "category": "Indian Ocean / Indian Geography",
        "question": "how does monsoon affect the Indian Ocean",
        "answer": "The monsoon reverses winds seasonally over the Indian Ocean: southwesterly winds bring heavy rainfall and upwelling in summer (June-Sept), while northeasterly winds dominate winter (Dec-Feb).",
        "keywords": ["monsoon ocean", "monsoon indian ocean", "southwest monsoon", "northeast monsoon"]
    },
    {
        "id": "ind_15",
        "category": "Indian Ocean / Indian Geography",
        "question": "which sea is near vizag",
        "answer": "Visakhapatnam (Vizag) is a major port city on the Andhra Pradesh coast in eastern India, bordering the Bay of Bengal.",
        "keywords": ["vizag", "visakhapatnam", "sea near vizag"]
    },
    {
        "id": "ind_16",
        "category": "Indian Ocean / Indian Geography",
        "question": "which sea is near kolkata",
        "answer": "Kolkata lies along the Hooghly River in West Bengal, which flows south into the Sundarbans mangrove delta and empties into the Bay of Bengal.",
        "keywords": ["kolkata", "calcutta", "sea near kolkata"]
    },
    {
        "id": "ind_17",
        "category": "Indian Ocean / Indian Geography",
        "question": "what is sundarbans delta",
        "answer": "The Sundarbans is the largest mangrove forest in the world, located in the delta region formed by the confluence of the Ganges, Brahmaputra and Meghna Rivers in the Bay of Bengal.",
        "keywords": ["sundarbans", "sundarbans delta", "mangrove delta"]
    },
    {
        "id": "ind_18",
        "category": "Indian Ocean / Indian Geography",
        "question": "which ocean is near karnataka",
        "answer": "Coastal Karnataka (including Mangalore and Udupi) lies along the Kanara region on the southwest coast of India, directly bordering the Arabian Sea.",
        "keywords": ["karnataka", "mangalore", "sea near karnataka", "ocean near mangalore"]
    },
    {
        "id": "ind_19",
        "category": "Indian Ocean / Indian Geography",
        "question": "which ocean is near gujarat",
        "answer": "Gujarat has India's longest coastline (approx 1,600 km), bounded by the Gulf of Kutch, Gulf of Khambhat, and the Arabian Sea.",
        "keywords": ["gujarat", "sea near gujarat", "gulf of kutch", "gulf of khambhat"]
    },
    {
        "id": "ind_20",
        "category": "Indian Ocean / Indian Geography",
        "question": "which ocean is near thiruvananthapuram",
        "answer": "Thiruvananthapuram (Trivandrum), the capital of Kerala, is located on the southwest coast of India bordering the Arabian Sea.",
        "keywords": ["thiruvananthapuram", "trivandrum", "sea near trivandrum"]
    },

    # =========================================================================
    # C. ARABIAN SEA / BAY OF BENGAL (20)
    # =========================================================================
    {
        "id": "as_bob_01",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "where is arabian sea located",
        "answer": "The Arabian Sea is a region of the northern Indian Ocean bounded by the Indian subcontinent to the east, Pakistan and Iran to the north, the Arabian Peninsula to the west, and the open Indian Ocean to the south.",
        "keywords": ["arabian sea", "where is arabian sea", "arabian sea location", "arabian sea enga irukku"]
    },
    {
        "id": "as_bob_02",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "where is bay of bengal",
        "answer": "The Bay of Bengal is the northeastern region of the Indian Ocean, bounded by India and Sri Lanka to the west, Bangladesh to the north, and Myanmar and the Andaman & Nicobar Islands to the east.",
        "keywords": ["bay of bengal", "where is bay of bengal", "bay of bengal location", "bay of bengal enga irukku"]
    },
    {
        "id": "as_bob_03",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "difference between arabian sea and bay of bengal",
        "answer": "The Arabian Sea has higher average salinity and stronger evaporation, while the Bay of Bengal receives immense fresh water river discharge (Ganges, Brahmaputra, Mahanadi), making its surface waters less saline and more stratified.",
        "keywords": ["difference between arabian sea and bay of bengal", "arabian sea vs bay of bengal", "compare arabian sea bay of bengal"]
    },
    {
        "id": "as_bob_04",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "why is bay of bengal less saline than arabian sea",
        "answer": "The Bay of Bengal receives heavy freshwater run-off from major river systems like the Ganges, Brahmaputra, and Irrawaddy, along with high monsoon rainfall, lowering its surface salinity compared to the arid Arabian Sea.",
        "keywords": ["why bay of bengal less saline", "bay of bengal salinity lower", "river discharge bay of bengal"]
    },
    {
        "id": "as_bob_05",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "why is arabian sea more saline",
        "answer": "High evaporation rates under hot solar radiation and dry winds from surrounding desert landmasses (Arabia and Africa), combined with minimal river freshwater inflow, make the Arabian Sea highly saline.",
        "keywords": ["why arabian sea more saline", "arabian sea high salinity", "evaporation arabian sea"]
    },
    {
        "id": "as_bob_06",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "why do more cyclones form in the bay of bengal",
        "answer": "The Bay of Bengal has warm sea surface temperatures year-round, high humidity, and receives remnants of Pacific typhoons, leading to more frequent tropical cyclones than the Arabian Sea.",
        "keywords": ["cyclones bay of bengal", "more cyclones in bay of bengal", "bay of bengal storms"]
    },
    {
        "id": "as_bob_07",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "what is oxygen minimum zone in arabian sea",
        "answer": "The Arabian Sea hosts one of the world's thickest Oxygen Minimum Zones (OMZ) at depths of 200m to 1000m due to high biological productivity driven by monsoon upwelling and slow deep-water ventilation.",
        "keywords": ["oxygen minimum zone", "omz", "arabian sea omz", "low oxygen arabian sea"]
    },
    {
        "id": "as_bob_08",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "what is findlater jet",
        "answer": "The Findlater Jet (or Somali Jet) is a strong low-level atmospheric wind jet blowing from east Africa across the Arabian Sea during the Southwest Monsoon, driving powerful coastal upwelling off Somalia and Oman.",
        "keywords": ["findlater jet", "somali jet", "somali jet upwelling"]
    },
    {
        "id": "as_bob_09",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "what is somali current",
        "answer": "The Somali Current is an ocean boundary current that flows along the coast of Somalia and Oman. It reverses direction seasonally, driven by the Southwest and Northeast monsoons.",
        "keywords": ["somali current", "somalia current", "reversing current arabian sea"]
    },
    {
        "id": "as_bob_10",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "what rivers empty into bay of bengal",
        "answer": "Major rivers emptying into the Bay of Bengal include the Ganges, Brahmaputra, Meghna, Mahanadi, Godavari, Krishna, and Kaveri.",
        "keywords": ["rivers in bay of bengal", "rivers flow into bay of bengal", "ganges bay of bengal"]
    },
    {
        "id": "as_bob_11",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "what rivers empty into arabian sea",
        "answer": "Major rivers flowing into the Arabian Sea include the Indus, Narmada, Tapti, and Netravati.",
        "keywords": ["rivers in arabian sea", "rivers flow into arabian sea", "indus river sea"]
    },
    {
        "id": "as_bob_12",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "what is west india coastal current",
        "answer": "The West India Coastal Current (WICC) flows southward along India's west coast during the summer monsoon and northward during the winter monsoon, transporting low-salinity water from the Bay of Bengal.",
        "keywords": ["west india coastal current", "wicc", "coastal current western india"]
    },
    {
        "id": "as_bob_13",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "what is east india coastal current",
        "answer": "The East India Coastal Current (EICC) flows along the east coast of India, moving northward from February to September and reversing southward during the winter monsoon.",
        "keywords": ["east india coastal current", "eicc", "coastal current eastern india"]
    },
    {
        "id": "as_bob_14",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "what is gulf of khambhat",
        "answer": "The Gulf of Khambhat (formerly Gulf of Cambay) is an inlet of the Arabian Sea along the western coast of India in Gujarat, known for high tidal ranges.",
        "keywords": ["gulf of khambhat", "gulf of cambay", "khambhat gulf"]
    },
    {
        "id": "as_bob_15",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "what is gulf of kutch",
        "answer": "The Gulf of Kutch is an inlet of the Arabian Sea along the west coast of India in Gujarat, separating Kutch from the Kathiawar peninsula.",
        "keywords": ["gulf of kutch", "kutch gulf", "gulf in gujarat"]
    },
    {
        "id": "as_bob_16",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "what is gulf of aden",
        "answer": "The Gulf of Aden is located in the Arabian Sea between Yemen on the south coast of the Arabian Peninsula and Somalia in the Horn of Africa, connecting to the Red Sea via the Bab-el-Mandeb strait.",
        "keywords": ["gulf of aden", "aden gulf", "where is gulf of aden"]
    },
    {
        "id": "as_bob_17",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "what is gulf of oman",
        "answer": "The Gulf of Oman connects the Arabian Sea with the Strait of Hormuz, which then runs into the Persian Gulf.",
        "keywords": ["gulf of oman", "oman gulf", "where is gulf of oman"]
    },
    {
        "id": "as_bob_18",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "what is the average depth of arabian sea",
        "answer": "The average depth of the Arabian Sea is about 2,734 meters (8,970 ft), with its maximum depth reaching around 4,652 meters.",
        "keywords": ["depth of arabian sea", "how deep is arabian sea", "arabian sea depth"]
    },
    {
        "id": "as_bob_19",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "what is the average depth of bay of bengal",
        "answer": "The average depth of the Bay of Bengal is about 2,600 meters (8,500 ft), with a maximum depth of 4,694 meters.",
        "keywords": ["depth of bay of bengal", "how deep is bay of bengal", "bay of bengal depth"]
    },
    {
        "id": "as_bob_20",
        "category": "Arabian Sea / Bay of Bengal",
        "question": "why is the northern indian ocean unique",
        "answer": "The Northern Indian Ocean is landlocked to the north by the Asian continent, preventing polar communication and driving strong seasonal monsoon wind reversals that dictate its circulation and upwelling.",
        "keywords": ["northern indian ocean unique", "unique features of indian ocean", "landlocked ocean north"]
    },

    # =========================================================================
    # D. OCEAN SCIENCE BASICS (25)
    # =========================================================================
    {
        "id": "sci_01",
        "category": "Ocean Science Basics",
        "question": "what is thermocline",
        "answer": "The thermocline is a steep temperature gradient layer in a body of water, marked by a rapid decrease in temperature with increasing depth below the warm surface mixed layer.",
        "keywords": ["thermocline", "what is thermocline", "thermocline meaning", "thermocline definition", "thermocline na enna"]
    },
    {
        "id": "sci_02",
        "category": "Ocean Science Basics",
        "question": "what is halocline",
        "answer": "The halocline is a subtype of chemocline where salinity changes rapidly with depth, creating a distinct boundary between water masses of different salt concentration.",
        "keywords": ["halocline", "what is halocline", "halocline definition", "halocline meaning"]
    },
    {
        "id": "sci_03",
        "category": "Ocean Science Basics",
        "question": "what is pycnocline",
        "answer": "The pycnocline is the layer in an ocean or lake where water density increases rapidly with depth, primarily governed by changes in temperature and salinity.",
        "keywords": ["pycnocline", "what is pycnocline", "pycnocline definition", "pycnocline meaning"]
    },
    {
        "id": "sci_04",
        "category": "Ocean Science Basics",
        "question": "what is mixed layer",
        "answer": "The mixed layer is the uppermost layer of the ocean where wind, waves, and surface heating homogenize water temperature, salinity, and density uniformly.",
        "keywords": ["mixed layer", "ocean mixed layer", "mixed layer depth", "mld"]
    },
    {
        "id": "sci_05",
        "category": "Ocean Science Basics",
        "question": "what is deep ocean",
        "answer": "The deep ocean refers to water layers below 1,000 meters (bathypelagic and abyssopelagic zones), characterized by permanent darkness, extreme hydrostatic pressure, and cold temperatures near 0°C to 4°C.",
        "keywords": ["deep ocean", "abyss", "abyssal zone", "deep sea"]
    },
    {
        "id": "sci_06",
        "category": "Ocean Science Basics",
        "question": "why is the ocean salty",
        "answer": "Ocean water is salty because rainwater dissolves minerals and salts from rocks on land, which rivers carry into the ocean. Evaporation removes pure water vapour, leaving salt behind to accumulate over millions of years.",
        "keywords": ["why is ocean salty", "why is the ocean salty", "ocean salt origin", "why sea water salty"]
    },
    {
        "id": "sci_07",
        "category": "Ocean Science Basics",
        "question": "why is the ocean blue",
        "answer": "The ocean appears blue because water molecules absorb red, orange, and yellow wavelengths of sunlight more strongly than blue light, allowing blue wavelengths to penetrate deeper and scatter back to our eyes.",
        "keywords": ["why is ocean blue", "why is the ocean blue", "color of ocean", "blue light ocean"]
    },
    {
        "id": "sci_08",
        "category": "Ocean Science Basics",
        "question": "what is ocean current",
        "answer": "An ocean current is a continuous, directed movement of seawater generated by forces acting upon the water, including wind, the Coriolis effect, breaking waves, cable friction, and temperature/salinity density differences.",
        "keywords": ["ocean current", "what is ocean current", "ocean currents", "ocean current na enna"]
    },
    {
        "id": "sci_09",
        "category": "Ocean Science Basics",
        "question": "what is upwelling",
        "answer": "Upwelling is an oceanographic process where deep, cold, nutrient-rich water rises toward the surface, replacing warmer surface water displaced by wind and the Coriolis effect.",
        "keywords": ["upwelling", "what is upwelling", "coastal upwelling", "upwelling definition"]
    },
    {
        "id": "sci_10",
        "category": "Ocean Science Basics",
        "question": "what is downwelling",
        "answer": "Downwelling occurs when surface water accumulates, becomes denser (through cooling or evaporation), and sinks down into the deeper ocean.",
        "keywords": ["downwelling", "what is downwelling", "downwelling definition"]
    },
    {
        "id": "sci_11",
        "category": "Ocean Science Basics",
        "question": "what causes ocean currents",
        "answer": "Ocean currents are driven by atmospheric wind friction, Earth's rotation (Coriolis effect), solar heating variations, salinity differences (thermohaline circulation), and coastal bathymetry.",
        "keywords": ["what causes ocean currents", "cause of ocean currents", "how currents form"]
    },
    {
        "id": "sci_12",
        "category": "Ocean Science Basics",
        "question": "what causes waves",
        "answer": "Wind blowing across the ocean surface transfers kinetic energy to water molecules, creating wind waves. Seismic events or underwater landslides create tsunami waves.",
        "keywords": ["what causes waves", "how waves form", "ocean waves cause"]
    },
    {
        "id": "sci_13",
        "category": "Ocean Science Basics",
        "question": "what causes tides",
        "answer": "Tides are periodic rises and falls of ocean sea levels caused by gravitational pull exerted by the Moon and Sun combined with Earth's rotation.",
        "keywords": ["what causes tides", "cause of tides", "how tides work", "moon tides"]
    },
    {
        "id": "sci_14",
        "category": "Ocean Science Basics",
        "question": "what is thermohaline circulation",
        "answer": "Thermohaline circulation (often called the global ocean conveyor belt) is a large-scale ocean density-driven movement powered by surface heat and freshwater fluxes, circulating cold deep water and warm surface currents worldwide.",
        "keywords": ["thermohaline circulation", "conveyor belt ocean", "global conveyor belt"]
    },
    {
        "id": "sci_15",
        "category": "Ocean Science Basics",
        "question": "what is Coriolis effect",
        "answer": "The Coriolis effect is an apparent deflection of moving objects (such as wind and ocean currents) caused by Earth's rotation, turning currents to the right in the Northern Hemisphere and left in the Southern Hemisphere.",
        "keywords": ["coriolis effect", "coriolis force", "what is coriolis"]
    },
    {
        "id": "sci_16",
        "category": "Ocean Science Basics",
        "question": "what is bathymetry",
        "answer": "Bathymetry is the study and mapping of underwater ocean floor topography, measuring water depths and seabed landforms.",
        "keywords": ["bathymetry", "what is bathymetry", "ocean floor mapping"]
    },
    {
        "id": "sci_17",
        "category": "Ocean Science Basics",
        "question": "what is euphotic zone",
        "answer": "The euphotic (or sunlight) zone is the uppermost ocean layer (down to ~200 meters) where sufficient sunlight penetrates to enable photosynthesis by marine plants and phytoplankton.",
        "keywords": ["euphotic zone", "sunlight zone", "photic zone"]
    },
    {
        "id": "sci_18",
        "category": "Ocean Science Basics",
        "question": "what is aphotic zone",
        "answer": "The aphotic zone is the ocean depth region below ~1,000 meters where sunlight cannot penetrate, leaving the environment in absolute darkness.",
        "keywords": ["aphotic zone", "dark zone ocean", "no light ocean"]
    },
    {
        "id": "sci_19",
        "category": "Ocean Science Basics",
        "question": "what is phytoplankton",
        "answer": "Phytoplankton are microscopic marine photosynthetic organisms floating in surface waters that produce over 50% of Earth's oxygen and form the foundation of aquatic food webs.",
        "keywords": ["phytoplankton", "microscopic marine plants", "ocean oxygen producers"]
    },
    {
        "id": "sci_20",
        "category": "Ocean Science Basics",
        "question": "what is zooplankton",
        "answer": "Zooplankton are small drifting marine animals (including krill, copepods, and larval fish) that feed on phytoplankton and serve as crucial prey for larger marine species.",
        "keywords": ["zooplankton", "marine plankton animals", "krill copepods"]
    },
    {
        "id": "sci_21",
        "category": "Ocean Science Basics",
        "question": "what is ocean stratification",
        "answer": "Ocean stratification refers to the natural separation of water into distinct horizontal layers based on density differences (warm/light water floating over cold/dense deep water).",
        "keywords": ["ocean stratification", "water layers ocean", "stratified ocean"]
    },
    {
        "id": "sci_22",
        "category": "Ocean Science Basics",
        "question": "what is internal wave",
        "answer": "Internal waves are underwater waves that propagate along density interfaces (such as the thermocline or pycnocline) beneath the ocean surface.",
        "keywords": ["internal wave", "internal waves", "underwater wave"]
    },
    {
        "id": "sci_23",
        "category": "Ocean Science Basics",
        "question": "what is sea surface height",
        "answer": "Sea Surface Height (SSH) is the topography of the ocean surface measured relative to Earth's geoid, influenced by ocean currents, heat storage, and gravity variations.",
        "keywords": ["sea surface height", "ssh", "altimetry height"]
    },
    {
        "id": "sci_24",
        "category": "Ocean Science Basics",
        "question": "what is ocean heat content",
        "answer": "Ocean Heat Content (OHC) is the total thermal energy absorbed and stored by ocean waters, serving as a primary indicator of climate change and global warming.",
        "keywords": ["ocean heat content", "ohc", "thermal energy ocean"]
    },
    {
        "id": "sci_25",
        "category": "Ocean Science Basics",
        "question": "why is ocean monitoring important",
        "answer": "Monitoring the ocean helps predict weather patterns, monsoons, and extreme storms; track climate change and sea level rise; ensure maritime safety; and protect marine ecosystems.",
        "keywords": ["why ocean monitoring important", "why monitor ocean", "importance of ocean observations"]
    },

    # =========================================================================
    # E. TEMPERATURE / SALINITY / DENSITY (15)
    # =========================================================================
    {
        "id": "tsd_01",
        "category": "Temperature / Salinity / Density",
        "question": "what is ocean temperature",
        "answer": "Ocean temperature varies widely from around 30°C in equatorial surface waters to -2°C in polar deep waters. Heat from the Sun warms the surface mixed layer, while deep waters remain cold.",
        "keywords": ["what is ocean temperature", "sea surface temperature", "sst", "ocean heat"]
    },
    {
        "id": "tsd_02",
        "category": "Temperature / Salinity / Density",
        "question": "what is salinity",
        "answer": "Salinity measures the concentration of dissolved mineral salts in water, typically expressed in Practical Salinity Units (PSU) or parts per thousand (ppt). Average seawater salinity is ~35 PSU.",
        "keywords": ["what is salinity", "salinity meaning", "salinity definition", "salinity meaning enna", "psu"]
    },
    {
        "id": "tsd_03",
        "category": "Temperature / Salinity / Density",
        "question": "how are ocean temperatures measured",
        "answer": "Ocean temperatures are measured using autonomous ARGO profiling floats, satellite radiometers (SST), CTD sensors on oceanographic ships, moorings, and Expendable Bathythermographs (XBTs).",
        "keywords": ["how are ocean temperatures measured", "measuring ocean temperature", "temperature sensors ocean"]
    },
    {
        "id": "tsd_04",
        "category": "Temperature / Salinity / Density",
        "question": "how is salinity measured",
        "answer": "Salinity is measured by testing the electrical conductivity of seawater using conductivity cells mounted on CTD instruments or ARGO floats, as conductive salt ions increase electrical flow.",
        "keywords": ["how is salinity measured", "measuring salinity", "conductivity cell salinity"]
    },
    {
        "id": "tsd_05",
        "category": "Temperature / Salinity / Density",
        "question": "what is seawater density",
        "answer": "Seawater density depends on temperature, salinity, and pressure. Cold, highly saline water is denser and sinks, while warm, fresh water is lighter and floats at the surface.",
        "keywords": ["seawater density", "density of ocean water", "water density ocean"]
    },
    {
        "id": "tsd_06",
        "category": "Temperature / Salinity / Density",
        "question": "what is practical salinity unit",
        "answer": "Practical Salinity Unit (PSU) is a dimensionless scale based on the electrical conductivity ratio of seawater relative to a standard potassium chloride (KCl) solution at 15°C.",
        "keywords": ["practical salinity unit", "psu definition", "what is psu"]
    },
    {
        "id": "tsd_07",
        "category": "Temperature / Salinity / Density",
        "question": "what is sea surface temperature anomaly",
        "answer": "A Sea Surface Temperature Anomaly (SSTA) is the difference between current observed water temperature and the long-term historical average for that specific location and time of year.",
        "keywords": ["sea surface temperature anomaly", "sst anomaly", "temperature anomaly definition"]
    },
    {
        "id": "tsd_08",
        "category": "Temperature / Salinity / Density",
        "question": "what is marine heatwave",
        "answer": "A marine heatwave is an extended period of abnormally high sea surface temperatures relative to local seasonal historical baselines, devastating coral reefs and marine life.",
        "keywords": ["marine heatwave", "what is marine heatwave", "ocean heatwave"]
    },
    {
        "id": "tsd_09",
        "category": "Temperature / Salinity / Density",
        "question": "what is ctd profile",
        "answer": "A CTD profile measures Conductivity, Temperature, and Depth continuously as an instrument package descends through the ocean column, generating vertical hydrographic profiles.",
        "keywords": ["ctd profile", "ctd measurement", "conductivity temperature depth"]
    },
    {
        "id": "tsd_10",
        "category": "Temperature / Salinity / Density",
        "question": "what is potential temperature",
        "answer": "Potential temperature is the temperature a water parcel would attain if brought adiabatically to a standard reference pressure (such as surface pressure) without heat exchange.",
        "keywords": ["potential temperature", "theta ocean", "adiabatic temperature"]
    },
    {
        "id": "tsd_11",
        "category": "Temperature / Salinity / Density",
        "question": "what is conservative temperature",
        "answer": "Conservative Temperature (CT) is an accurate modern thermodynamic measure representing the potential enthalpy of seawater under TEOS-10 standard international oceanographic equations.",
        "keywords": ["conservative temperature", "teos-10", "thermodynamic temperature"]
    },
    {
        "id": "tsd_12",
        "category": "Temperature / Salinity / Density",
        "question": "what is absolute salinity",
        "answer": "Absolute Salinity (SA) measures the exact mass fraction of dissolved salt in seawater (in g/kg), replacing practical salinity under modern TEOS-10 standards.",
        "keywords": ["absolute salinity", "sa salinity", "teos-10 salinity"]
    },
    {
        "id": "tsd_13",
        "category": "Temperature / Salinity / Density",
        "question": "why does freezing point of sea water drop",
        "answer": "Dissolved salts lower seawater's freezing point from 0°C to approximately -1.9°C (at typical 35 PSU salinity), preventing sea ice from forming until colder temperatures.",
        "keywords": ["freezing point of seawater", "why seawater freezes below zero", "salt lowers freezing point"]
    },
    {
        "id": "tsd_14",
        "category": "Temperature / Salinity / Density",
        "question": "what is speed of sound in seawater",
        "answer": "Sound travels at about 1,500 meters per second in seawater (nearly 5 times faster than in air), increasing with higher temperature, salinity, and pressure.",
        "keywords": ["speed of sound in seawater", "sonar speed water", "acoustic speed ocean"]
    },
    {
        "id": "tsd_15",
        "category": "Temperature / Salinity / Density",
        "question": "what is sound fixing and ranging channel",
        "answer": "The SOFAR channel (Sound Fixing and Ranging channel) is a deep ocean layer where sound speed reaches a minimum, acting as an acoustic wave-guide carrying low-frequency sound thousands of kilometers.",
        "keywords": ["sofar channel", "sound channel ocean", "acoustic waveguide"]
    },

    # =========================================================================
    # F. ARGO / PROFILING FLOATS (15)
    # =========================================================================
    {
        "id": "argo_01",
        "category": "ARGO / Profiling Floats",
        "question": "what is an argo float",
        "answer": "An ARGO float is an autonomous robotic profiling drift float that measures temperature, salinity, pressure (depth), and ocean currents from the surface down to 2,000 meters depth.",
        "keywords": ["what is an argo float", "argo float", "argo floats", "argo robot", "profiling float"]
    },
    {
        "id": "argo_02",
        "category": "ARGO / Profiling Floats",
        "question": "how does an argo float work",
        "answer": "An ARGO float changes its buoyancy by pumping oil into or out of an external hydraulic bladder. It drifts at a parking depth (~1,000m) for 9 days, sinks to 2,000m, then ascends while recording temperature and salinity profiles before transmitting data via satellite.",
        "keywords": ["how does an argo float work", "how argo works", "argo buoyancy bladder", "argo cycle"]
    },
    {
        "id": "argo_03",
        "category": "ARGO / Profiling Floats",
        "question": "how deep can an argo float go",
        "answer": "Standard core ARGO floats profile down to 2,000 meters depth. Advanced Deep ARGO floats are designed to descent down to 6,000 meters to observe the abyss.",
        "keywords": ["how deep can an argo float go", "argo depth limit", "deep argo depth", "2000m argo"]
    },
    {
        "id": "argo_04",
        "category": "ARGO / Profiling Floats",
        "question": "how many argo floats are in the ocean",
        "answer": "The global ARGO array consists of nearly 4,000 active robotic floats deployed across all world ocean basins, providing continuous real-time oceanographic coverage.",
        "keywords": ["how many argo floats", "number of argo floats", "global argo array size"]
    },
    {
        "id": "argo_05",
        "category": "ARGO / Profiling Floats",
        "question": "what is bgc argo",
        "answer": "Biogeochemical ARGO (BGC-ARGO) floats carry additional sensors measuring dissolved oxygen, pH, nitrate, chlorophyll-a, light intensity, and optical backscatter to monitor marine ecosystem health.",
        "keywords": ["bgc argo", "biogeochemical argo", "oxygen argo sensor", "ph argo"]
    },
    {
        "id": "argo_06",
        "category": "ARGO / Profiling Floats",
        "question": "what is deep argo",
        "answer": "Deep ARGO is an extension of the ARGO array designed to profile the lower half of the ocean volume (from 2,000m down to 6,000m depth) to track deep ocean warming.",
        "keywords": ["deep argo", "abyssal argo", "deep ocean profiling"]
    },
    {
        "id": "argo_07",
        "category": "ARGO / Profiling Floats",
        "question": "what is INCOIS",
        "answer": "INCOIS (Indian National Centre for Ocean Information Services) is an autonomous organization under India's Ministry of Earth Sciences that manages Indian Ocean ARGO deployments, tsunami warnings, and ocean state forecasts.",
        "keywords": ["incois", "what is incois", "indian ocean services", "incois argo"]
    },
    {
        "id": "argo_08",
        "category": "ARGO / Profiling Floats",
        "question": "how do argo floats transmit data",
        "answer": "When an ARGO float surfaces after completing a vertical profile, it uses satellite networks (like Iridium or Argos) to transmit its GPS location and sensor data back to ground stations within hours.",
        "keywords": ["argo satellite transmission", "how argo sends data", "iridium argo"]
    },
    {
        "id": "argo_09",
        "category": "ARGO / Profiling Floats",
        "question": "what is an argo cycle",
        "answer": "An ARGO cycle typically lasts 10 days: 9 days drifting at 1,000m depth, descent to 2,000m, vertical ascent while collecting CTD measurements, and 6-12 hours at the surface transmitting data.",
        "keywords": ["argo cycle", "10 day argo cycle", "argo profile cycle"]
    },
    {
        "id": "argo_10",
        "category": "ARGO / Profiling Floats",
        "question": "what is float wmo id",
        "answer": "A Float WMO ID is a unique 7-digit identifier assigned by the World Meteorological Organization (e.g., Float 2902203) to globally track individual profiling floats.",
        "keywords": ["wmo id", "float wmo id", "float identifier", "float number"]
    },
    {
        "id": "argo_11",
        "category": "ARGO / Profiling Floats",
        "question": "what is lifespan of an argo float",
        "answer": "An ARGO float is powered by specialized lithium batteries and typically operates autonomously for 4 to 5 years (performing about 150 to 180 vertical profiles).",
        "keywords": ["lifespan of argo float", "argo float battery life", "how long argo float lasts"]
    },
    {
        "id": "argo_12",
        "category": "ARGO / Profiling Floats",
        "question": "who maintains the argo program",
        "answer": "The ARGO program is an international collaboration involving over 30 countries, co-led by IOC-UNESCO and the World Meteorological Organization (WMO).",
        "keywords": ["who maintains argo", "argo program leaders", "wmo unesco argo"]
    },
    {
        "id": "argo_13",
        "category": "ARGO / Profiling Floats",
        "question": "what is argo parking depth",
        "answer": "The parking depth (typically 1,000 meters) is the intermediate depth where an ARGO float drifts passively with ocean currents for ~9 days between vertical profiles.",
        "keywords": ["argo parking depth", "parking depth 1000m", "drift depth argo"]
    },
    {
        "id": "argo_14",
        "category": "ARGO / Profiling Floats",
        "question": "what is delayed mode quality control in argo",
        "answer": "Delayed-Mode Quality Control (DMQC) involves detailed post-processing by oceanographic experts to calibrate sensor drift (such as salinity cell fouling) over a float's multi-year lifetime.",
        "keywords": ["dmqc", "delayed mode quality control", "argo sensor drift calibration"]
    },
    {
        "id": "argo_15",
        "category": "ARGO / Profiling Floats",
        "question": "why is argo data open access",
        "answer": "ARGO data is strictly open-access and freely available to scientists, meteorologists, and the public worldwide within 24 hours of collection to advance climate research and operational forecasting.",
        "keywords": ["argo open access", "is argo data free", "free ocean data"]
    },

    # =========================================================================
    # G. CLIMATE / MARINE ENVIRONMENT (15)
    # =========================================================================
    {
        "id": "clim_01",
        "category": "Climate / Marine Environment",
        "question": "what is ocean acidification",
        "answer": "Ocean acidification is the ongoing decrease in ocean pH caused by seawater absorbing excess atmospheric carbon dioxide (CO2), producing carbonic acid which harms shell-forming organisms and coral reefs.",
        "keywords": ["ocean acidification", "what is ocean acidification", "ph drop ocean", "co2 seawater"]
    },
    {
        "id": "clim_02",
        "category": "Climate / Marine Environment",
        "question": "how does ocean affect climate",
        "answer": "The ocean regulates global climate by absorbing over 90% of excess solar heat and 30% of human CO2 emissions, transporting heat from the equator to polar regions via surface and deep currents.",
        "keywords": ["how does ocean affect climate", "ocean climate regulator", "heat capacity ocean"]
    },
    {
        "id": "clim_03",
        "category": "Climate / Marine Environment",
        "question": "what is sea level rise",
        "answer": "Sea level rise is driven primarily by two climate warming factors: thermal expansion (water expanding as it warms) and melting land ice (glaciers and ice sheets in Greenland and Antarctica).",
        "keywords": ["sea level rise", "what is sea level rise", "thermal expansion ocean", "melting ice sea level"]
    },
    {
        "id": "clim_04",
        "category": "Climate / Marine Environment",
        "question": "what is El Niño",
        "answer": "El Niño is a climate pattern marked by abnormal warming of central and eastern equatorial Pacific surface waters, weakening trade winds and altering global weather and rainfall patterns.",
        "keywords": ["el nino", "what is el niño", "el niño climate", "pacific warming"]
    },
    {
        "id": "clim_05",
        "category": "Climate / Marine Environment",
        "question": "what is La Niña",
        "answer": "La Niña is the cool phase of ENSO, characterized by below-average sea surface temperatures in the central/eastern equatorial Pacific and strengthened trade winds.",
        "keywords": ["la nina", "what is la niña", "la niña climate", "pacific cooling"]
    },
    {
        "id": "clim_06",
        "category": "Climate / Marine Environment",
        "question": "what is coral bleaching",
        "answer": "Coral bleaching occurs when corals under heat stress expel their symbiotic algae (zooxanthellae), turning stark white and risking starvation and mortality.",
        "keywords": ["coral bleaching", "what is coral bleaching", "bleached coral", "coral reef heat"]
    },
    {
        "id": "clim_07",
        "category": "Climate / Marine Environment",
        "question": "what is ocean pollution",
        "answer": "Ocean pollution stems from land-based runoff, agricultural nutrients, untreated sewage, industrial toxins, oil spills, and plastic debris entering marine ecosystems.",
        "keywords": ["ocean pollution", "what is ocean pollution", "marine pollution", "sea pollution"]
    },
    {
        "id": "clim_08",
        "category": "Climate / Marine Environment",
        "question": "what is microplastic",
        "answer": "Microplastics are tiny plastic fragments smaller than 5 millimeters resulting from industrial manufacturing or the breakdown of larger consumer plastics, posing severe risks to marine life.",
        "keywords": ["microplastic", "microplastics", "what is microplastic", "plastic debris sea"]
    },
    {
        "id": "clim_09",
        "category": "Climate / Marine Environment",
        "question": "what is blue carbon",
        "answer": "Blue carbon refers to carbon dioxide captured and stored naturally by coastal ocean ecosystems like mangroves, seagrasses, and salt marshes.",
        "keywords": ["blue carbon", "what is blue carbon", "mangrove carbon storage"]
    },
    {
        "id": "clim_10",
        "category": "Climate / Marine Environment",
        "question": "what is ocean deoxygenation",
        "answer": "Ocean deoxygenation is the expansion of low-oxygen zones in the ocean driven by ocean warming (which reduces oxygen solubility) and nutrient pollution.",
        "keywords": ["ocean deoxygenation", "low oxygen ocean", "hypoxia sea"]
    },
    {
        "id": "clim_11",
        "category": "Climate / Marine Environment",
        "question": "what is dead zone in ocean",
        "answer": "A marine dead zone (hypoxic zone) is an area in an ocean or lake where oxygen levels are too low to support fish and marine animal life, often caused by agricultural runoff.",
        "keywords": ["dead zone", "marine dead zone", "hypoxic zone"]
    },
    {
        "id": "clim_12",
        "category": "Climate / Marine Environment",
        "question": "what is great pacific garbage patch",
        "answer": "The Great Pacific Garbage Patch is a massive accumulation of floating ocean plastic debris spinning inside the North Pacific Subtropical Gyre.",
        "keywords": ["great pacific garbage patch", "garbage patch", "pacific plastic gyre"]
    },
    {
        "id": "clim_13",
        "category": "Climate / Marine Environment",
        "question": "what is Atlantic Meridional Overturning Circulation",
        "answer": "The AMOC (Atlantic Meridional Overturning Circulation) is a major Atlantic current system carrying warm surface water northward and cold deep water southward, regulating North American and European climates.",
        "keywords": ["amoc", "atlantic meridional overturning circulation", "gulf stream circulation"]
    },
    {
        "id": "clim_14",
        "category": "Climate / Marine Environment",
        "question": "what is thermal expansion of water",
        "answer": "Thermal expansion means water volume increases as its temperature rises. In the ocean, thermal expansion accounts for about one-third to one-half of global sea level rise.",
        "keywords": ["thermal expansion", "water expansion warming", "thermal expansion sea level"]
    },
    {
        "id": "clim_15",
        "category": "Climate / Marine Environment",
        "question": "what is marine biodiversity",
        "answer": "Marine biodiversity encompasses the variety of living organisms in the oceans, ranging from microscopic plankton and coral reefs to giant blue whales and deep-sea hydrothermal vent extremophiles.",
        "keywords": ["marine biodiversity", "ocean life diversity", "marine ecosystem species"]
    },

    # =========================================================================
    # H. OCEAN EXPLORATION / TECHNOLOGY (15)
    # =========================================================================
    {
        "id": "tech_01",
        "category": "Ocean Exploration / Technology",
        "question": "what is sonar",
        "answer": "SONAR (Sound Navigation and Ranging) is a technique that uses acoustic sound propagation to navigate, communicate, or detect underwater objects and map seabed bathymetry.",
        "keywords": ["sonar", "what is sonar", "sound navigation and ranging", "acoustic sonar"]
    },
    {
        "id": "tech_02",
        "category": "Ocean Exploration / Technology",
        "question": "what is underwater glider",
        "answer": "An underwater glider is an autonomous underwater vehicle (AUV) that uses small changes in its buoyancy to glide forward through water without a propeller, executing long monitoring missions.",
        "keywords": ["underwater glider", "ocean glider", "buoyancy glider auv"]
    },
    {
        "id": "tech_03",
        "category": "Ocean Exploration / Technology",
        "question": "what is remote sensing in oceanography",
        "answer": "Satellite remote sensing uses radar altimeters, infrared radiometers, and ocean color sensors to observe sea surface height, surface temperature, winds, and chlorophyll concentrations from space.",
        "keywords": ["remote sensing oceanography", "satellite oceanography", "ocean satellite sensing"]
    },
    {
        "id": "tech_04",
        "category": "Ocean Exploration / Technology",
        "question": "what is auv",
        "answer": "An Autonomous Underwater Vehicle (AUV) is a self-propelled underwater robot that travels without requiring real-time input from a human operator, mapping sea beds and collecting ocean samples.",
        "keywords": ["auv", "autonomous underwater vehicle", "underwater robot"]
    },
    {
        "id": "tech_05",
        "category": "Ocean Exploration / Technology",
        "question": "what is rov",
        "answer": "A Remotely Operated Vehicle (ROV) is a tethered underwater robot maneuvered by a pilot aboard a ship, equipped with cameras, lights, and robotic arms for deep ocean manipulation.",
        "keywords": ["rov", "remotely operated vehicle", "tethered underwater robot"]
    },
    {
        "id": "tech_06",
        "category": "Ocean Exploration / Technology",
        "question": "what is altimetry",
        "answer": "Satellite radar altimetry measures the precise time it takes for a radar pulse to travel from a satellite to the sea surface and back, calculating sea surface topography.",
        "keywords": ["altimetry", "satellite altimetry", "radar altimeter ocean"]
    },
    {
        "id": "tech_07",
        "category": "Ocean Exploration / Technology",
        "question": "what is acoustic doppler current profiler",
        "answer": "An ADCP (Acoustic Doppler Current Profiler) measures water current velocities across depth ranges using the Doppler effect of sound waves scattered by particles suspended in seawater.",
        "keywords": ["adcp", "acoustic doppler current profiler", "doppler water velocity"]
    },
    {
        "id": "tech_08",
        "category": "Ocean Exploration / Technology",
        "question": "what is hydrothermal vent",
        "answer": "A hydrothermal vent is a fissure on the seafloor where geothermally heated water emerges, supporting unique ecosystems fueled by chemosynthetic bacteria in total darkness.",
        "keywords": ["hydrothermal vent", "black smoker", "deep sea smoker"]
    },
    {
        "id": "tech_09",
        "category": "Ocean Exploration / Technology",
        "question": "what is ocean observatory",
        "answer": "An ocean observatory is an integrated network of undersea cables, moorings, radar systems, and autonomous instruments providing continuous real-time marine data.",
        "keywords": ["ocean observatory", "undersea observatory", "mooring network"]
    },
    {
        "id": "tech_10",
        "category": "Ocean Exploration / Technology",
        "question": "what is float-chat",
        "answer": "FloatChat is an AI-powered ocean intelligence platform that simplifies complex ARGO oceanographic data and spatial observations through natural language conversations, 4D visualizations, and automated anomaly detection.",
        "keywords": ["floatchat", "what is floatchat", "float chat", "floatchat platform"]
    },
    {
        "id": "tech_11",
        "category": "Ocean Exploration / Technology",
        "question": "what is sea surface salinity satellite",
        "answer": "Satellites such as NASA's Aquarius and ESA's SMOS measure microwave thermal emissions from the ocean surface to estimate sea surface salinity globally from space.",
        "keywords": ["sea surface salinity satellite", "smos satellite", "aquarius salinity"]
    },
    {
        "id": "tech_12",
        "category": "Ocean Exploration / Technology",
        "question": "what is expendable bathythermograph",
        "answer": "An Expendable Bathythermograph (XBT) is a probe dropped from ships that measures temperature profiles as it falls through the water, transmitting data via a fine copper wire.",
        "keywords": ["expendable bathythermograph", "xbt probe", "ship temperature probe"]
    },
    {
        "id": "tech_13",
        "category": "Ocean Exploration / Technology",
        "question": "what is deep sea mining",
        "answer": "Deep sea mining is the process of retrieving mineral deposits (polymetallic nodules, cobalt crusts) from the ocean seabed at depths below 200 meters.",
        "keywords": ["deep sea mining", "seabed mining", "polymetallic nodules"]
    },
    {
        "id": "tech_14",
        "category": "Ocean Exploration / Technology",
        "question": "what is tsunami early warning system",
        "answer": "A tsunami early warning system uses seismic networks and seafloor pressure sensors (DART buoys) to detect undersea earthquakes and acoustic waves, calculating tsunami arrival times.",
        "keywords": ["tsunami warning system", "dart buoys", "tsunami warning incois"]
    },
    {
        "id": "tech_15",
        "category": "Ocean Exploration / Technology",
        "question": "what is modern oceanography",
        "answer": "Modern oceanography integrates physics, chemistry, geology, biology, satellite remote sensing, autonomous ARGO robotics, and AI modeling to understand global ocean dynamics.",
        "keywords": ["modern oceanography", "oceanography science", "ocean research tech"]
    }
]

assert len(OCEAN_KNOWLEDGE_BASE) == 150, f"Expected 150 entries, got {len(OCEAN_KNOWLEDGE_BASE)}"
