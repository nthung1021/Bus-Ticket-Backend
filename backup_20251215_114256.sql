--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: bookings_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.bookings_status_enum AS ENUM (
    'pending',
    'paid',
    'cancelled',
    'expired'
);


ALTER TYPE public.bookings_status_enum OWNER TO postgres;

--
-- Name: notifications_channel_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notifications_channel_enum AS ENUM (
    'email',
    'sms',
    'push',
    'in_app'
);


ALTER TYPE public.notifications_channel_enum OWNER TO postgres;

--
-- Name: notifications_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notifications_status_enum AS ENUM (
    'pending',
    'sent',
    'failed',
    'delivered',
    'read'
);


ALTER TYPE public.notifications_status_enum OWNER TO postgres;

--
-- Name: operators_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.operators_status_enum AS ENUM (
    'pending',
    'approved',
    'suspended'
);


ALTER TYPE public.operators_status_enum OWNER TO postgres;

--
-- Name: payments_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payments_status_enum AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded',
    'cancelled'
);


ALTER TYPE public.payments_status_enum OWNER TO postgres;

--
-- Name: route_points_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.route_points_type_enum AS ENUM (
    'pickup',
    'dropoff',
    'both'
);


ALTER TYPE public.route_points_type_enum OWNER TO postgres;

--
-- Name: seat_layouts_layouttype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.seat_layouts_layouttype_enum AS ENUM (
    'standard_2x2',
    'standard_2x3',
    'vip_1x2',
    'sleeper_1x2',
    'custom'
);


ALTER TYPE public.seat_layouts_layouttype_enum OWNER TO postgres;

--
-- Name: seat_status_state_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.seat_status_state_enum AS ENUM (
    'available',
    'booked',
    'locked',
    'reserved'
);


ALTER TYPE public.seat_status_state_enum OWNER TO postgres;

--
-- Name: seats_seattype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.seats_seattype_enum AS ENUM (
    'normal',
    'vip',
    'business'
);


ALTER TYPE public.seats_seattype_enum OWNER TO postgres;

--
-- Name: trips_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.trips_status_enum AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'delayed'
);


ALTER TYPE public.trips_status_enum OWNER TO postgres;

--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_role_enum AS ENUM (
    'admin',
    'customer',
    'operator'
);


ALTER TYPE public.users_role_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    actor_id uuid,
    target_user_id uuid,
    action character varying NOT NULL,
    details text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    trip_id uuid NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    status public.bookings_status_enum DEFAULT 'pending'::public.bookings_status_enum NOT NULL,
    booked_at timestamp without time zone DEFAULT now() NOT NULL,
    cancelled_at timestamp without time zone,
    booking_reference character varying(255),
    contact_email character varying,
    contact_phone character varying,
    last_modified_at timestamp with time zone
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: buses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.buses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    operator_id uuid NOT NULL,
    plate_number character varying NOT NULL,
    model character varying NOT NULL,
    seat_capacity integer NOT NULL,
    amenities_json json
);


ALTER TABLE public.buses OWNER TO postgres;

--
-- Name: feedbacks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedbacks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    trip_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    submitted_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.feedbacks OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    booking_id uuid NOT NULL,
    channel public.notifications_channel_enum DEFAULT 'email'::public.notifications_channel_enum NOT NULL,
    template character varying NOT NULL,
    status public.notifications_status_enum DEFAULT 'pending'::public.notifications_status_enum NOT NULL,
    sent_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: operators; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.operators (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    contact_email character varying NOT NULL,
    contact_phone character varying NOT NULL,
    status public.operators_status_enum DEFAULT 'pending'::public.operators_status_enum NOT NULL,
    approved_at timestamp without time zone
);


ALTER TABLE public.operators OWNER TO postgres;

--
-- Name: passenger_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.passenger_details (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    booking_id uuid NOT NULL,
    full_name character varying NOT NULL,
    document_id character varying NOT NULL,
    seat_code character varying NOT NULL
);


ALTER TABLE public.passenger_details OWNER TO postgres;

--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_methods (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    provider character varying NOT NULL,
    token character varying NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payment_methods OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    booking_id uuid NOT NULL,
    provider character varying NOT NULL,
    transaction_ref character varying NOT NULL,
    amount numeric(10,2) NOT NULL,
    status public.payments_status_enum DEFAULT 'pending'::public.payments_status_enum NOT NULL,
    processed_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    token character varying NOT NULL,
    "userId" uuid NOT NULL,
    "expiresAt" timestamp without time zone NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: route_points; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.route_points (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    latitude numeric(10,6) NOT NULL,
    longitude numeric(10,6) NOT NULL,
    type public.route_points_type_enum DEFAULT 'both'::public.route_points_type_enum NOT NULL,
    "order" integer NOT NULL,
    "distanceFromStart" integer,
    "estimatedTimeFromStart" integer,
    "routeId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.route_points OWNER TO postgres;

--
-- Name: routes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.routes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    operator_id uuid,
    origin character varying NOT NULL,
    destination character varying NOT NULL,
    estimated_minutes integer,
    name character varying NOT NULL,
    description character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    amenities json,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    distance_km numeric(8,2)
);


ALTER TABLE public.routes OWNER TO postgres;

--
-- Name: seat_layouts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seat_layouts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    bus_id uuid NOT NULL,
    "layoutType" public.seat_layouts_layouttype_enum DEFAULT 'standard_2x2'::public.seat_layouts_layouttype_enum NOT NULL,
    total_rows integer NOT NULL,
    seats_per_row integer NOT NULL,
    layout_config json NOT NULL,
    seat_pricing json NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.seat_layouts OWNER TO postgres;

--
-- Name: seat_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seat_status (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    trip_id uuid NOT NULL,
    seat_id uuid NOT NULL,
    booking_id uuid,
    state public.seat_status_state_enum DEFAULT 'available'::public.seat_status_state_enum NOT NULL,
    locked_until timestamp with time zone
);


ALTER TABLE public.seat_status OWNER TO postgres;

--
-- Name: seats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seats (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    bus_id uuid NOT NULL,
    seat_code character varying NOT NULL,
    "seatType" public.seats_seattype_enum DEFAULT 'normal'::public.seats_seattype_enum NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.seats OWNER TO postgres;

--
-- Name: trips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trips (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    route_id uuid NOT NULL,
    bus_id uuid NOT NULL,
    departure_time timestamp with time zone NOT NULL,
    arrival_time timestamp with time zone NOT NULL,
    base_price numeric(10,2) NOT NULL,
    status public.trips_status_enum DEFAULT 'scheduled'::public.trips_status_enum NOT NULL
);


ALTER TABLE public.trips OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "googleId" character varying,
    email character varying NOT NULL,
    name character varying NOT NULL,
    phone character varying,
    password_hash character varying NOT NULL,
    role public.users_role_enum DEFAULT 'customer'::public.users_role_enum NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, actor_id, target_user_id, action, details, metadata, created_at) FROM stdin;
06001960-09a3-418b-901a-e54ad07a3162	\N	\N	AUTO_EXPIRED_BOOKING	Booking 06e06df1-4236-4708-9b7b-ac4b93522891 automatically expired due to timeout	{"bookingId": "06e06df1-4236-4708-9b7b-ac4b93522891", "expiredAt": "2025-12-06T05:40:00.041Z", "newStatus": "expired", "previousStatus": "pending"}	2025-12-06 12:40:00.042509
cec29232-d3e6-47f2-9426-bfaa92e5e9af	\N	\N	AUTO_EXPIRED_BOOKING	Booking 560ca337-2963-412a-bbab-b4151a6a4cfd automatically expired due to timeout	{"bookingId": "560ca337-2963-412a-bbab-b4151a6a4cfd", "expiredAt": "2025-12-06T05:55:00.075Z", "newStatus": "expired", "previousStatus": "pending"}	2025-12-06 12:55:00.08689
426cc1f1-2b31-4575-8049-30e180b76046	aa206880-179b-4709-a9fd-4988fe45b55f	\N	USER_CANCEL_BOOKING	Booking 2698726d-f631-473b-a899-d50c6abb80ea cancelled by user	{"bookingId": "2698726d-f631-473b-a899-d50c6abb80ea", "newStatus": "cancelled", "cancelledAt": "2025-12-06T06:45:09.965Z", "previousStatus": "pending"}	2025-12-06 13:45:10.016638
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (id, user_id, trip_id, total_amount, status, booked_at, cancelled_at, booking_reference, contact_email, contact_phone, last_modified_at) FROM stdin;
06e06df1-4236-4708-9b7b-ac4b93522891	aa206880-179b-4709-a9fd-4988fe45b55f	6f304d61-2d83-4325-b34b-63bed27407fc	300000.00	expired	2025-12-06 12:21:30.101847	\N	BK-06E06DF1	\N	\N	\N
560ca337-2963-412a-bbab-b4151a6a4cfd	aa206880-179b-4709-a9fd-4988fe45b55f	6f304d61-2d83-4325-b34b-63bed27407fc	150000.00	expired	2025-12-06 12:35:49.883503	\N	BK-560CA337	\N	\N	\N
9fcd674b-3d44-4072-b4cb-a559b61d59b4	aa206880-179b-4709-a9fd-4988fe45b55f	897f674f-8d41-414b-8edf-0dae01d3372f	350000.00	paid	2025-12-06 13:14:28.651467	\N	BK-9FCD674B	\N	\N	\N
2698726d-f631-473b-a899-d50c6abb80ea	aa206880-179b-4709-a9fd-4988fe45b55f	6f304d61-2d83-4325-b34b-63bed27407fc	350000.00	cancelled	2025-12-06 12:39:16.444101	2025-12-06 13:45:09.956	BK-2698726D	\N	\N	\N
\.


--
-- Data for Name: buses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.buses (id, operator_id, plate_number, model, seat_capacity, amenities_json) FROM stdin;
f24c127b-c2ae-4f6d-8639-1db9eb2763aa	eb506151-67fe-49f1-8a46-482846f72772	51B-12345	Mercedes Sprinter 2020	30	["wifi","ac","toilet"]
9b000c86-c184-41da-8034-b65f75f57728	afbc5590-abcc-44bf-b0d5-20d17951ed54	51B-54321	Thaco 2019	40	["ac"]
563bfb74-5c5d-445c-b6a8-10870c1036c2	3e399c57-ee6f-4702-9e8d-d0aac86a6c4a	29B-11111	Volvo 2017	45	["ac","wifi"]
4b6316d1-733a-4888-b692-e88ed8c1978e	afbc5590-abcc-44bf-b0d5-20d17951ed54	43B-22222	Hyundai Universe 2019	38	["ac"]
cfb066d5-ccc8-44c7-a59a-86dda08804d8	eb506151-67fe-49f1-8a46-482846f72772	79C-98765	Isuzu 2018	34	["wifi","ac","recliner"]
\.


--
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feedbacks (id, user_id, trip_id, rating, comment, submitted_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
2	1640000000001	AddPerformanceIndexes1640000000001
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, booking_id, channel, template, status, sent_at) FROM stdin;
\.


--
-- Data for Name: operators; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.operators (id, name, contact_email, contact_phone, status, approved_at) FROM stdin;
eb506151-67fe-49f1-8a46-482846f72772	Saigon Express	hello@saigonexpress.vn	0901234567	approved	2025-12-06 09:58:24.938
afbc5590-abcc-44bf-b0d5-20d17951ed54	Central Express	contact@central.vn	0902223344	approved	2025-12-06 09:58:24.938
3e399c57-ee6f-4702-9e8d-d0aac86a6c4a	Red River Transport	info@redriver.vn	0903334455	approved	2025-12-06 09:58:24.938
\.


--
-- Data for Name: passenger_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.passenger_details (id, booking_id, full_name, document_id, seat_code) FROM stdin;
33f888c8-9418-4897-a23d-6b2f238b1fc1	06e06df1-4236-4708-9b7b-ac4b93522891	phat	111111111111	11A
a418c864-4e2e-4532-b21c-b8f9405e68ba	06e06df1-4236-4708-9b7b-ac4b93522891	John Smith 	122222222221	9B
57855c32-fd29-4b55-b637-d19b45fecc40	560ca337-2963-412a-bbab-b4151a6a4cfd	Phát Hồ	111111111111	9A
76b5402c-f967-4575-9edc-099de52a53f8	2698726d-f631-473b-a899-d50c6abb80ea	John Smith	111111111111	1A
efad77fc-8b7c-4646-be1e-8abe895d7f13	9fcd674b-3d44-4072-b4cb-a559b61d59b4	Phát Hồ	111111111111	1A
\.


--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_methods (id, user_id, provider, token, is_default, created_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, booking_id, provider, transaction_ref, amount, status, processed_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, token, "userId", "expiresAt", "createdAt") FROM stdin;
44709dee-7ddc-40d5-9706-c2087b3ab98d	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjQ1NTc0NTQsImV4cCI6MTc2NTE2MjI1NH0.Ct2ZJOSCaJHgcmh6H36jyhTk6Ih4pTDhMNDQO2GSYfY	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-08 09:50:54.35	2025-12-01 09:50:54.351895
44d55e2b-18fb-4c88-b30e-656649599372	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjQ5ODI0MDAsImV4cCI6MTc2NTU4NzIwMH0.jmzKxHk4ryNxWrFGDaGgL6Wa28UPZIoLkswFb0OWGD8	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-13 07:53:20.413	2025-12-06 07:53:20.421814
7188d1f4-f6cc-462d-bfb7-aaf74fb0124d	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjQ5ODI0MDAsImV4cCI6MTc2NTU4NzIwMH0.jmzKxHk4ryNxWrFGDaGgL6Wa28UPZIoLkswFb0OWGD8	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-13 07:53:20.433	2025-12-06 07:53:20.434365
1f4ef8c5-674f-4ad9-a2dd-c70ccdbf36ea	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjQ5ODUzOTcsImV4cCI6MTc2NTU5MDE5N30.JxUkkmlBPJ170A_YjzZ-a6s5BFBHo6TT1JTr06oL9So	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-13 08:43:17.545	2025-12-06 08:43:17.549164
274b0e2d-6793-4266-bcc4-b9b80a965b0b	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjQ5ODU0MjksImV4cCI6MTc2NTU5MDIyOX0.HEJNnHOR4A9sE5Q_VaQqyu2erZJIWoHroGsUAWD4MoU	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-13 08:43:49.085	2025-12-06 08:43:49.086605
2cf058c6-0109-4718-a3eb-557aa42c6e11	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjQ5ODU0NDksImV4cCI6MTc2NTU5MDI0OX0.GWo2rcgs-WRKCQiypDVqqUjDFJGLOiM8QrUrA5RxDP4	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-13 08:44:09.511	2025-12-06 08:44:09.512516
8f379cfb-7cb6-4b1a-a172-3c0236a07f0e	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjQ5ODU3NDgsImV4cCI6MTc2NTU5MDU0OH0.PzOOgHDjh3qnYWan-uLfBUVcqCa4VPBMaYnBvdVhs70	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-13 08:49:08.09	2025-12-06 08:49:08.093004
9f2f4636-444e-475d-b826-976f182d2d09	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjQ5ODU3NjIsImV4cCI6MTc2NTU5MDU2Mn0.825s2q0P9rtiaqTPJTMBT9zXuW7Mf75CgEpSULgNZo4	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-13 08:49:22.478	2025-12-06 08:49:22.479968
8af61aef-d875-4654-8bf9-792965e12fa3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjQ5ODYxMTcsImV4cCI6MTc2NTU5MDkxN30.c6gUdIcdTvDEJjpxHWrTK8v24dyQ1nJ8Jv75zqz_EXo	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-13 08:55:17.424	2025-12-06 08:55:17.428004
0b53ea9c-cbeb-4cac-9a84-ecd866c53567	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjQ5ODY1NDUsImV4cCI6MTc2NTU5MTM0NX0.wTbRKVTb3SqA7Klftn1Ba0p5Gu-34qteuHZI2XrcTow	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-13 09:02:25.253	2025-12-06 09:02:25.256738
ea30d6dd-199a-41ac-98a9-10350af11f49	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjQ5OTcwMDgsImV4cCI6MTc2NTYwMTgwOH0._0LPRqSWMMphUiG1oH9Idgb5K7MKj4IC3bKTs9s0mJA	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-13 11:56:48.6	2025-12-06 11:56:48.606103
5425c5d7-f00b-4dda-9da8-42cdb5270575	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjUwMDI1OTUsImV4cCI6MTc2NTYwNzM5NX0.aIwjJSDtNCiWzfJJHnD9x_eubGm7tmQjuwRn6L7GY9Q	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-13 13:29:55.915	2025-12-06 13:29:55.918515
10ecb95e-57bc-4196-bc59-04cce76d02ae	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjU3NDE2NzYsImV4cCI6MTc2NjM0NjQ3Nn0.mhDHybvRhD3vFKh1Y107YvXLF5NVlq5Ck0NBNHC0CbM	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-22 02:47:56.511	2025-12-15 02:47:56.518128
b5b54f80-9e09-4380-86e0-feedbcc23be4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTIwNjg4MC0xNzliLTQ3MDktYTlmZC00OTg4ZmU0NWI1NWYiLCJpYXQiOjE3NjU3NzIwNzUsImV4cCI6MTc2NjM3Njg3NX0.NTIP6odlwoFGSOjYdf3lXB3HBNufo_BpK-UD6cKHZ68	aa206880-179b-4709-a9fd-4988fe45b55f	2025-12-22 11:14:35.914	2025-12-15 11:14:35.919481
a1ed4015-8f1c-4c36-a85a-ec8979f6c783	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwYWYzNWI2Ny1jZmE3LTRkYjUtYWVjYi0wMTQ5MDk2NmYwOWQiLCJpYXQiOjE3NjU3NzI3MjQsImV4cCI6MTc2NjM3NzUyNH0.7IUuKMLxETWBYH_p55Fc3g6az21lTXJYYI8gTPNOzYU	0af35b67-cfa7-4db5-aecb-01490966f09d	2025-12-22 11:25:24.476	2025-12-15 11:25:24.477023
\.


--
-- Data for Name: route_points; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.route_points (id, name, latitude, longitude, type, "order", "distanceFromStart", "estimatedTimeFromStart", "routeId", "createdAt", "updatedAt") FROM stdin;
b0614648-8739-460d-9fa9-7775a7c72035	Ho Chi Minh pickup/dropoff point	0.000000	0.000000	both	1	0	0	0a299466-e414-4e23-8841-0b5f2e312200	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
6f9cce3c-59f4-4cbf-bd8c-72a78da3eedc	Nha Trang pickup/dropoff point	0.000000	0.000000	both	2	435000	420	0a299466-e414-4e23-8841-0b5f2e312200	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
04b8c062-4fad-4e91-b2ca-3a6809d63ec4	Ho Chi Minh pickup/dropoff point	0.000000	0.000000	both	1	0	0	1e989554-68b7-4bc5-af27-4f42a8c5ab24	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
73e95c8a-f318-40cc-9c3a-fdcadcd5aaba	Da Lat pickup/dropoff point	0.000000	0.000000	both	2	315000	360	1e989554-68b7-4bc5-af27-4f42a8c5ab24	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
b66f9e47-c4c2-4f64-8133-9d0d8f8f929f	Ho Chi Minh pickup/dropoff point	0.000000	0.000000	both	1	0	0	a15aea5b-4e8e-49e8-8e29-d7ac669cac74	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
2c5f0471-6b9a-474f-a716-09ddecc57384	Vung Tau pickup/dropoff point	0.000000	0.000000	both	2	120000	150	a15aea5b-4e8e-49e8-8e29-d7ac669cac74	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
fd504b2c-1ab8-496f-a0af-6d607bb61a7a	Ho Chi Minh pickup/dropoff point	0.000000	0.000000	both	1	0	0	4ea1f164-98ee-4520-b22b-821f4f26d101	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
f5d4842b-d9b3-40ba-b553-ec29baf0c277	Cu Chi pickup/dropoff point	0.000000	0.000000	both	2	70000	90	4ea1f164-98ee-4520-b22b-821f4f26d101	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
1dd9661c-4577-4040-840a-1d8e84ff198d	Nha Trang pickup/dropoff point	0.000000	0.000000	both	1	0	0	a69637bc-c9d3-4727-9115-a72f91dab4e6	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
516be62b-868f-4a55-b514-8f28662a6dc7	Qui Nhon pickup/dropoff point	0.000000	0.000000	both	2	210000	240	a69637bc-c9d3-4727-9115-a72f91dab4e6	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
41fcd926-7a22-42de-b7bd-fbe27469f4cb	Ha Noi pickup/dropoff point	0.000000	0.000000	both	1	0	0	a8bcb67f-cbab-44e7-b9a4-a2ed695e5f69	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
04b646dc-0ecb-4533-852a-1d0f627755d7	Hai Phong pickup/dropoff point	0.000000	0.000000	both	2	120000	150	a8bcb67f-cbab-44e7-b9a4-a2ed695e5f69	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
a24d8cb6-e511-459e-9985-89d91055b06b	Ha Noi pickup/dropoff point	0.000000	0.000000	both	1	0	0	173983bc-4823-4b34-abf6-e7e8a14954ab	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
8ff8129b-80e5-4f20-8a41-69417636d338	Ninh Binh pickup/dropoff point	0.000000	0.000000	both	2	95000	120	173983bc-4823-4b34-abf6-e7e8a14954ab	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
4cbda2c8-bbad-4b21-a879-f7d28926eb68	Da Nang pickup/dropoff point	0.000000	0.000000	both	1	0	0	4e3fbbee-5228-4775-905e-3e5c29e059a0	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
09f496c7-eacb-4960-952c-249caf0c7028	Hue pickup/dropoff point	0.000000	0.000000	both	2	100000	120	4e3fbbee-5228-4775-905e-3e5c29e059a0	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
ea95a4c9-4877-4d33-af42-9a624a02c4e3	Da Nang pickup/dropoff point	0.000000	0.000000	both	1	0	0	1fc2f580-d6a2-46eb-9d5e-beafd33db607	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
5227d4cc-2e75-4e51-b7cf-c79338ff6ce0	Quang Ngai pickup/dropoff point	0.000000	0.000000	both	2	130000	180	1fc2f580-d6a2-46eb-9d5e-beafd33db607	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
a33adaf9-08a2-4c58-8421-a6ee4dc55e5e	Nha Trang pickup/dropoff point	0.000000	0.000000	both	1	0	0	77e33818-ba6f-44b5-892a-e64ba0164cd5	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
a9e8d3c5-6166-441c-9120-dc3a0b760dd0	Ho Chi Minh pickup/dropoff point	0.000000	0.000000	both	2	435000	420	77e33818-ba6f-44b5-892a-e64ba0164cd5	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536
\.


--
-- Data for Name: routes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.routes (id, operator_id, origin, destination, estimated_minutes, name, description, is_active, amenities, "createdAt", "updatedAt", distance_km) FROM stdin;
0a299466-e414-4e23-8841-0b5f2e312200	eb506151-67fe-49f1-8a46-482846f72772	Ho Chi Minh	Nha Trang	420	Ho Chi Minh - Nha Trang	Route from Ho Chi Minh to Nha Trang, approximately 435 km, around 7 hours of travel.	t	[]	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536	435.00
1e989554-68b7-4bc5-af27-4f42a8c5ab24	afbc5590-abcc-44bf-b0d5-20d17951ed54	Ho Chi Minh	Da Lat	360	Ho Chi Minh - Da Lat	Route from Ho Chi Minh to Da Lat, approximately 315 km, around 6 hours of travel.	t	[]	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536	315.00
a15aea5b-4e8e-49e8-8e29-d7ac669cac74	eb506151-67fe-49f1-8a46-482846f72772	Ho Chi Minh	Vung Tau	150	Ho Chi Minh - Vung Tau	Route from Ho Chi Minh to Vung Tau, approximately 120 km, around 3 hours of travel.	t	[]	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536	120.00
4ea1f164-98ee-4520-b22b-821f4f26d101	eb506151-67fe-49f1-8a46-482846f72772	Ho Chi Minh	Cu Chi	90	Ho Chi Minh - Cu Chi	Route from Ho Chi Minh to Cu Chi, approximately 70 km, around 2 hours of travel.	t	[]	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536	70.00
a69637bc-c9d3-4727-9115-a72f91dab4e6	eb506151-67fe-49f1-8a46-482846f72772	Nha Trang	Qui Nhon	240	Nha Trang - Qui Nhon	Route from Nha Trang to Qui Nhon, approximately 210 km, around 4 hours of travel.	t	[]	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536	210.00
a8bcb67f-cbab-44e7-b9a4-a2ed695e5f69	3e399c57-ee6f-4702-9e8d-d0aac86a6c4a	Ha Noi	Hai Phong	150	Ha Noi - Hai Phong	Route from Ha Noi to Hai Phong, approximately 120 km, around 3 hours of travel.	t	[]	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536	120.00
173983bc-4823-4b34-abf6-e7e8a14954ab	3e399c57-ee6f-4702-9e8d-d0aac86a6c4a	Ha Noi	Ninh Binh	120	Ha Noi - Ninh Binh	Route from Ha Noi to Ninh Binh, approximately 95 km, around 2 hours of travel.	t	[]	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536	95.00
4e3fbbee-5228-4775-905e-3e5c29e059a0	afbc5590-abcc-44bf-b0d5-20d17951ed54	Da Nang	Hue	120	Da Nang - Hue	Route from Da Nang to Hue, approximately 100 km, around 2 hours of travel.	t	[]	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536	100.00
1fc2f580-d6a2-46eb-9d5e-beafd33db607	afbc5590-abcc-44bf-b0d5-20d17951ed54	Da Nang	Quang Ngai	180	Da Nang - Quang Ngai	Route from Da Nang to Quang Ngai, approximately 130 km, around 3 hours of travel.	t	[]	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536	130.00
77e33818-ba6f-44b5-892a-e64ba0164cd5	3e399c57-ee6f-4702-9e8d-d0aac86a6c4a	Nha Trang	Ho Chi Minh	420	Nha Trang - Ho Chi Minh	Route from Nha Trang to Ho Chi Minh, approximately 435 km, around 7 hours of travel.	t	[]	2025-12-05 16:27:00.961536	2025-12-05 16:27:00.961536	435.00
\.


--
-- Data for Name: seat_layouts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.seat_layouts (id, bus_id, "layoutType", total_rows, seats_per_row, layout_config, seat_pricing, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: seat_status; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.seat_status (id, trip_id, seat_id, booking_id, state, locked_until) FROM stdin;
5726d491-c3e0-4ec6-8aa2-332704ae4277	6f304d61-2d83-4325-b34b-63bed27407fc	46a2d8b1-e942-4f6b-97fb-ea096de0acad	\N	available	\N
c548a121-b1da-4ca0-a066-dbdddb1fd86c	6f304d61-2d83-4325-b34b-63bed27407fc	530ba654-a6c5-450c-baed-a6fa52feab79	\N	available	\N
ac3ccb27-9d9d-4d30-959f-ba5982ce798b	6f304d61-2d83-4325-b34b-63bed27407fc	250e511f-2ceb-47dc-9cd3-fd24e30cba7c	\N	available	\N
49a13cc3-4254-4805-8dc4-7753d3a51dc3	897f674f-8d41-414b-8edf-0dae01d3372f	dd60318d-9bd0-464c-8d2e-698f4633fb85	9fcd674b-3d44-4072-b4cb-a559b61d59b4	booked	\N
76a1bea0-3b07-42d5-8d49-3a136967f5db	6f304d61-2d83-4325-b34b-63bed27407fc	4a0e7cb9-f6a0-4593-9da3-5b5196f3f741	2698726d-f631-473b-a899-d50c6abb80ea	available	\N
\.


--
-- Data for Name: seats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.seats (id, bus_id, seat_code, "seatType", is_active) FROM stdin;
d11c9512-fbe7-4f5e-acae-2b5b7115f9db	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	1A	business	t
84aa7850-b052-47ee-9c30-55289c97a91d	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	1B	business	t
f5870a3d-5d53-4f1c-bb4c-89c9249e6b0e	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	1C	business	t
7dcc0102-eb90-4b91-940a-a2b1eb83a648	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	1D	business	t
1dd4b9b4-8b0c-49b6-a45f-94b0ef23d718	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	2A	normal	t
26abc576-426a-422a-b8d2-5f5234b7c80b	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	2B	normal	t
98561cac-7118-4f3d-8226-f5e3efed681a	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	2C	normal	t
0cb47782-209b-45b2-a501-2ced0c8e689f	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	2D	normal	t
80ef92a7-4d83-44ef-a96e-c71a71cd1ec0	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	3A	normal	t
9a69aaeb-1651-4091-ad80-f1a446db58a5	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	3B	normal	t
766164cb-465f-4557-b9a9-1479eddde1e4	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	3C	normal	t
c35c6c58-51bf-4d47-84d6-cd31d85ec85a	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	3D	normal	t
1bea8c7b-7b51-49b4-94f4-4edb8904bb1d	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	4A	normal	t
adb7fb35-ed63-434f-9391-edac8392209c	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	4B	normal	t
ee0a67a2-073c-4426-af69-0cd92a28837b	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	4C	normal	t
14f1dd4e-db0a-4973-bd6f-56dec764c0fb	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	4D	normal	t
0602426d-9fe1-4f88-a5e6-62debefe80b0	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	5A	normal	t
14d44e59-cdc9-4061-b6f7-a1654741de5a	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	5B	normal	t
c45023d5-2dd1-4828-919d-94e63f0ba7c0	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	5C	normal	t
f5399ad4-9ddb-4d82-89c8-29aff39ddf9a	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	5D	normal	t
a452cdba-ba75-465d-b88c-c50191d702b6	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	6A	normal	t
2817b6a0-6933-48ad-a385-61d4b917664b	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	6B	normal	t
4dfd2b66-66f0-4de0-bb02-03f8b0c8177b	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	6C	normal	t
38fe8e13-e8e5-4c34-9dbd-9cb6163b3c2c	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	6D	normal	t
779f2ddf-cb15-433f-bbc2-fc3003aaceb5	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	7A	normal	t
a6d35d91-9703-4e3b-ad18-8ee41d510d00	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	7B	normal	t
faaa3a72-df80-43b2-89ce-75bd5dfdde29	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	7C	normal	t
17826775-c4d4-4658-af7d-b100a8188bc5	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	7D	normal	t
4a9d30da-a3ba-4838-937d-d5829e0e115c	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	8A	normal	t
f9f28b49-e3c4-4f0f-99d9-448c6c1fd4af	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	8B	normal	t
6ea3a1d4-64c1-43bc-9fa9-4f211c2c0035	9b000c86-c184-41da-8034-b65f75f57728	1A	business	t
3e499be1-bf93-405f-b1ab-8f1955eb15e1	9b000c86-c184-41da-8034-b65f75f57728	1B	business	t
97b2462d-9702-453f-963e-92ebd903704e	9b000c86-c184-41da-8034-b65f75f57728	1C	business	t
ed1bed44-fb8b-4b55-87fb-8b01023a34d8	9b000c86-c184-41da-8034-b65f75f57728	1D	business	t
9c8e4e45-9656-4d14-9e7f-e21fcbee01ce	9b000c86-c184-41da-8034-b65f75f57728	2A	normal	t
190b5fca-c0aa-4728-a2d6-23f74887e28f	9b000c86-c184-41da-8034-b65f75f57728	2B	normal	t
b0aa1081-ae7b-4de0-a8dc-4d4a6bf100e8	9b000c86-c184-41da-8034-b65f75f57728	2C	normal	t
f1d6f379-a908-401f-bfe3-40325ec482f8	9b000c86-c184-41da-8034-b65f75f57728	2D	normal	t
11847fb6-30b6-4af2-b5bf-949c505db744	9b000c86-c184-41da-8034-b65f75f57728	3A	normal	t
2c7dd98e-decf-4e64-971c-aa000b13299a	9b000c86-c184-41da-8034-b65f75f57728	3B	normal	t
00c86483-8d52-451f-83cf-064cbd49c868	9b000c86-c184-41da-8034-b65f75f57728	3C	normal	t
a915d1a7-feee-4b93-94d9-56520aad3e5e	9b000c86-c184-41da-8034-b65f75f57728	3D	normal	t
2b6cbbb9-9a3b-4ca6-9c87-25b5fdad46ce	9b000c86-c184-41da-8034-b65f75f57728	4A	normal	t
57d1b123-2063-47b4-abad-644af899de94	9b000c86-c184-41da-8034-b65f75f57728	4B	normal	t
47efd88b-1a98-4ee9-acd3-c57d1604d650	9b000c86-c184-41da-8034-b65f75f57728	4C	normal	t
fefb62b4-778f-46b6-9045-51504d83d95c	9b000c86-c184-41da-8034-b65f75f57728	4D	normal	t
230bcec9-44f5-4f4b-8134-286787a2c3d1	9b000c86-c184-41da-8034-b65f75f57728	5A	normal	t
c640fedf-5177-4673-85a3-532e1108fff5	9b000c86-c184-41da-8034-b65f75f57728	5B	normal	t
bae3c3fc-d6d8-40fb-a4b2-1d5b38d2b165	9b000c86-c184-41da-8034-b65f75f57728	5C	normal	t
4b9c9b5f-8bc6-4afe-908d-c4f7bd298a6e	9b000c86-c184-41da-8034-b65f75f57728	5D	normal	t
c5876c28-0e82-4d68-8932-05b209f8322a	9b000c86-c184-41da-8034-b65f75f57728	6A	normal	t
1a121227-8f75-4d94-a508-c1b84af8f99d	9b000c86-c184-41da-8034-b65f75f57728	6B	normal	t
fcdcd301-87d7-4f15-96ba-6e84e31df982	9b000c86-c184-41da-8034-b65f75f57728	6C	normal	t
9fb7a340-fd19-427a-a4c7-292f3c3e4993	9b000c86-c184-41da-8034-b65f75f57728	6D	normal	t
c1b63f79-06a1-4e9b-9b7f-5b22464ce1cd	9b000c86-c184-41da-8034-b65f75f57728	7A	normal	t
70fb103e-16e6-460b-aa4a-63a5efa81c85	9b000c86-c184-41da-8034-b65f75f57728	7B	normal	t
61b197c4-7de0-49ae-afb8-ec6a59ac4a63	9b000c86-c184-41da-8034-b65f75f57728	7C	normal	t
a4173ffe-f5a1-41d0-9096-e5bdf292e37d	9b000c86-c184-41da-8034-b65f75f57728	7D	normal	t
5c5e30f3-e5d2-4661-ab4e-a9bf6a50d4e5	9b000c86-c184-41da-8034-b65f75f57728	8A	normal	t
e287c569-8a98-4700-b05f-54a90ba6edac	9b000c86-c184-41da-8034-b65f75f57728	8B	normal	t
afa6ffc8-b6bf-4a98-91d7-094c5cd71097	9b000c86-c184-41da-8034-b65f75f57728	8C	normal	t
1d8c2df1-1cbc-4c33-8076-bcf2b2c0b2fa	9b000c86-c184-41da-8034-b65f75f57728	8D	normal	t
e0957110-e783-42fc-885c-b631a12a308b	9b000c86-c184-41da-8034-b65f75f57728	9A	normal	t
88062714-5077-4764-9122-3554101e1cc8	9b000c86-c184-41da-8034-b65f75f57728	9B	normal	t
6c7184bc-f1d0-48af-83f7-31af4ca858a4	9b000c86-c184-41da-8034-b65f75f57728	9C	normal	t
596cc8e7-e238-41b2-8317-e849af73d95c	9b000c86-c184-41da-8034-b65f75f57728	9D	normal	t
473b8f83-e82e-4a91-91e9-ec5eae7fcb57	9b000c86-c184-41da-8034-b65f75f57728	10A	normal	t
f7d57477-ade9-4313-ad43-dadde420ec2f	9b000c86-c184-41da-8034-b65f75f57728	10B	normal	t
416b3873-2dfa-498e-96bf-741d003f4894	9b000c86-c184-41da-8034-b65f75f57728	10C	normal	t
2d9c0e58-78c6-46df-9c6f-18d678eb1c4d	9b000c86-c184-41da-8034-b65f75f57728	10D	normal	t
4a0e7cb9-f6a0-4593-9da3-5b5196f3f741	563bfb74-5c5d-445c-b6a8-10870c1036c2	1A	business	t
8911ed2e-13a8-47fc-81b6-9188f6570ed7	563bfb74-5c5d-445c-b6a8-10870c1036c2	1B	business	t
d05e8887-3019-4210-a29d-7137f25d0182	563bfb74-5c5d-445c-b6a8-10870c1036c2	1C	business	t
ad100d19-2e7f-43b0-8a3a-dfa22a9940ad	563bfb74-5c5d-445c-b6a8-10870c1036c2	1D	business	t
c37fa74b-6b33-4e05-a0c1-6ce32a6cce95	563bfb74-5c5d-445c-b6a8-10870c1036c2	2A	business	t
d0fb7d36-4be9-451d-a907-d2e0f5e8b866	563bfb74-5c5d-445c-b6a8-10870c1036c2	2B	business	t
e76ec238-77df-4d38-add4-1ab31e824b4a	563bfb74-5c5d-445c-b6a8-10870c1036c2	2C	business	t
bd1b1411-1626-4875-9edd-c2c9867919cf	563bfb74-5c5d-445c-b6a8-10870c1036c2	2D	business	t
708b30dc-5eaf-4d8c-ace6-ebb37c59c5ee	563bfb74-5c5d-445c-b6a8-10870c1036c2	3A	vip	t
5789cddc-b7b3-4613-b098-80f2d052eb2e	563bfb74-5c5d-445c-b6a8-10870c1036c2	3C	vip	t
3ecdacd6-41f4-4a4d-847a-13e4183b5b05	563bfb74-5c5d-445c-b6a8-10870c1036c2	4A	normal	t
38fd5d13-dc30-4f3f-8f12-ab6d538c558f	563bfb74-5c5d-445c-b6a8-10870c1036c2	4B	normal	t
c5d66a6c-3c91-4c51-9261-1f47e559c304	563bfb74-5c5d-445c-b6a8-10870c1036c2	4C	normal	t
207aa1cb-92bd-4656-b35a-d2c3e85d07dd	563bfb74-5c5d-445c-b6a8-10870c1036c2	4D	normal	t
b39bf6cb-1f7f-4de3-a43d-67cf4c536092	563bfb74-5c5d-445c-b6a8-10870c1036c2	5A	normal	t
e5c9264f-739b-4030-bcee-007b313adbf1	563bfb74-5c5d-445c-b6a8-10870c1036c2	5B	normal	t
27e17f3b-29fe-48e4-817b-0296b8cb3b27	563bfb74-5c5d-445c-b6a8-10870c1036c2	5C	normal	t
a932c832-a726-4289-9fed-aff66a9bd1a3	563bfb74-5c5d-445c-b6a8-10870c1036c2	5D	normal	t
f7285c9f-c8ca-4cc7-8b1c-e2b49c6795cb	563bfb74-5c5d-445c-b6a8-10870c1036c2	6A	normal	t
04ce701f-8666-49ef-ad62-6f2304a314fd	563bfb74-5c5d-445c-b6a8-10870c1036c2	6B	normal	t
1ed61cb1-2568-48c4-b297-b7aa2069a4d4	563bfb74-5c5d-445c-b6a8-10870c1036c2	6C	normal	t
7a374bac-7e4d-4aa2-86be-b089cbab2692	563bfb74-5c5d-445c-b6a8-10870c1036c2	6D	normal	t
9e1b7a5e-2c3a-488d-a5c6-125d10d0c388	563bfb74-5c5d-445c-b6a8-10870c1036c2	7A	normal	t
7896b0ae-dc4b-43b2-922b-b3c76ba3072c	563bfb74-5c5d-445c-b6a8-10870c1036c2	7B	normal	t
b5b2d89b-179c-47ae-b18f-5e74fd7e7787	563bfb74-5c5d-445c-b6a8-10870c1036c2	7C	normal	t
9e5c59e7-82fb-4adc-b6ef-de4c70c5d128	563bfb74-5c5d-445c-b6a8-10870c1036c2	7D	normal	t
4443b439-a8e7-4fec-8cb5-6c31254a12eb	563bfb74-5c5d-445c-b6a8-10870c1036c2	8A	normal	t
e4d2afea-93bb-4072-9d39-cbdc6edbec34	563bfb74-5c5d-445c-b6a8-10870c1036c2	8B	normal	t
a1435b26-fd33-4c4f-98dd-e300189b1b23	563bfb74-5c5d-445c-b6a8-10870c1036c2	8C	normal	t
d1602664-75ed-4752-9ba5-87a1cd1c3a87	563bfb74-5c5d-445c-b6a8-10870c1036c2	8D	normal	t
250e511f-2ceb-47dc-9cd3-fd24e30cba7c	563bfb74-5c5d-445c-b6a8-10870c1036c2	9A	normal	t
530ba654-a6c5-450c-baed-a6fa52feab79	563bfb74-5c5d-445c-b6a8-10870c1036c2	9B	normal	t
c973dae0-c755-436a-9bb4-bb2dc47b8360	563bfb74-5c5d-445c-b6a8-10870c1036c2	9C	normal	t
f473dc5c-c783-4253-a72b-a80b9040d4b6	563bfb74-5c5d-445c-b6a8-10870c1036c2	9D	normal	t
d7800659-2e57-40f7-8d06-9b5778e9e3f0	563bfb74-5c5d-445c-b6a8-10870c1036c2	10A	normal	t
84823466-4d72-41e9-b8eb-bfab06c93a74	563bfb74-5c5d-445c-b6a8-10870c1036c2	10B	normal	t
2f4672ab-5c49-47d8-99a4-6fe397096289	563bfb74-5c5d-445c-b6a8-10870c1036c2	10C	normal	t
55242b6f-f0e9-4644-959f-db44f48c91d2	563bfb74-5c5d-445c-b6a8-10870c1036c2	10D	normal	t
46a2d8b1-e942-4f6b-97fb-ea096de0acad	563bfb74-5c5d-445c-b6a8-10870c1036c2	11A	normal	t
56618c13-951a-4ce9-8ce4-e9a216975e8b	563bfb74-5c5d-445c-b6a8-10870c1036c2	11B	normal	t
a169ddf4-5260-41ee-8e92-ed7c54988923	563bfb74-5c5d-445c-b6a8-10870c1036c2	11C	normal	t
619b2853-ec61-4e0e-be42-ebb9b459d8df	563bfb74-5c5d-445c-b6a8-10870c1036c2	11D	normal	t
dd174f3d-119b-4ba9-a6c1-2f62c954a61d	563bfb74-5c5d-445c-b6a8-10870c1036c2	12A	normal	t
846e00fc-979b-4f11-9d48-c88a247647ee	563bfb74-5c5d-445c-b6a8-10870c1036c2	12B	normal	t
c36161cd-0cb1-4ac4-876b-a1b7c3a18276	563bfb74-5c5d-445c-b6a8-10870c1036c2	12C	normal	t
dd60318d-9bd0-464c-8d2e-698f4633fb85	4b6316d1-733a-4888-b692-e88ed8c1978e	1A	business	t
23164c08-741d-4448-84b9-b1acec835352	4b6316d1-733a-4888-b692-e88ed8c1978e	1B	business	t
7208cb53-52e2-4b2b-b692-99f7c1dda0df	4b6316d1-733a-4888-b692-e88ed8c1978e	1C	business	t
479cbd11-ebb5-4973-99c0-3cd4131515c6	4b6316d1-733a-4888-b692-e88ed8c1978e	1D	business	t
f81f7bed-002f-406e-82c1-890f8c3457a1	4b6316d1-733a-4888-b692-e88ed8c1978e	2A	normal	t
7e03663d-1bb9-4237-bb32-cf19951de3fe	4b6316d1-733a-4888-b692-e88ed8c1978e	2B	normal	t
faffd7c6-6e02-4020-ab81-a7e49eb30d8f	4b6316d1-733a-4888-b692-e88ed8c1978e	2C	normal	t
89f8d065-ae92-414c-a503-bbce10af972d	4b6316d1-733a-4888-b692-e88ed8c1978e	2D	normal	t
0ba3b0fa-f3a1-4c33-88fc-ef3053786957	4b6316d1-733a-4888-b692-e88ed8c1978e	3A	normal	t
6dbeda2a-3b32-4cba-8ead-3d35f873bc14	4b6316d1-733a-4888-b692-e88ed8c1978e	3B	normal	t
6d1dcda8-6f09-4e0d-a14b-119ce3662a8c	4b6316d1-733a-4888-b692-e88ed8c1978e	3C	normal	t
61605554-3745-4e3e-a125-ac1b22e00cca	4b6316d1-733a-4888-b692-e88ed8c1978e	3D	normal	t
65792dce-e9ff-49f7-8fa5-c595eae18bb8	4b6316d1-733a-4888-b692-e88ed8c1978e	4A	normal	t
c5778d4d-24b3-41ec-ad66-ef23d9c76846	4b6316d1-733a-4888-b692-e88ed8c1978e	4B	normal	t
5ab519bf-7e65-4b1a-acbd-b9cda92b589e	4b6316d1-733a-4888-b692-e88ed8c1978e	4C	normal	t
24435231-bacc-4429-97f3-81e2340240d2	4b6316d1-733a-4888-b692-e88ed8c1978e	4D	normal	t
df4cc2ee-61a3-48fc-bd23-71af5c313902	4b6316d1-733a-4888-b692-e88ed8c1978e	5A	normal	t
29514926-6287-42c5-9933-4125532988b8	4b6316d1-733a-4888-b692-e88ed8c1978e	5B	normal	t
f34191c1-93d6-4861-835b-569a5029cdb2	4b6316d1-733a-4888-b692-e88ed8c1978e	5C	normal	t
87c231e2-eefb-484e-9801-2350fbfffb7e	4b6316d1-733a-4888-b692-e88ed8c1978e	5D	normal	t
32428757-aa48-4939-82ab-ce0aaf55ab49	4b6316d1-733a-4888-b692-e88ed8c1978e	6A	normal	t
f5dc98dd-d7f3-4984-af2e-630546ceac80	4b6316d1-733a-4888-b692-e88ed8c1978e	6B	normal	t
fb080710-a977-48ab-adf0-65f8ba911131	4b6316d1-733a-4888-b692-e88ed8c1978e	6C	normal	t
512a229a-7615-4105-9f07-a644f4cd17b4	4b6316d1-733a-4888-b692-e88ed8c1978e	6D	normal	t
7853b4b1-48af-448b-8601-d1c4f6ec0b7b	4b6316d1-733a-4888-b692-e88ed8c1978e	7A	normal	t
cddeb708-6d59-4f3d-bc32-0c44a4db6be8	4b6316d1-733a-4888-b692-e88ed8c1978e	7B	normal	t
9c8128b8-61c1-468c-a759-cf818a33c1ea	4b6316d1-733a-4888-b692-e88ed8c1978e	7C	normal	t
06f7cb6a-55c5-4b1b-a39b-41ce1ca635d6	4b6316d1-733a-4888-b692-e88ed8c1978e	7D	normal	t
2026bf06-1938-454f-bd2c-416eb935cdc5	4b6316d1-733a-4888-b692-e88ed8c1978e	8A	normal	t
d283053a-5837-4325-a18b-64967f35e118	4b6316d1-733a-4888-b692-e88ed8c1978e	8B	normal	t
2eab3d98-f27a-4d70-aeda-475287eef081	4b6316d1-733a-4888-b692-e88ed8c1978e	8C	normal	t
2aeb2f1b-1134-4071-a745-2dca6af689ee	4b6316d1-733a-4888-b692-e88ed8c1978e	8D	normal	t
913046f1-1d1d-4b5d-8361-847ed16a7b56	4b6316d1-733a-4888-b692-e88ed8c1978e	9A	normal	t
4dfec5a2-ef01-4c98-9e1a-1cac80999924	4b6316d1-733a-4888-b692-e88ed8c1978e	9B	normal	t
0f5caba2-a035-4e20-879c-596512ff2678	4b6316d1-733a-4888-b692-e88ed8c1978e	9C	normal	t
e726839e-b509-40c5-9eee-2b0689e38dfb	4b6316d1-733a-4888-b692-e88ed8c1978e	9D	normal	t
8ee43565-1cb8-471f-9ca7-75bad1a2708d	4b6316d1-733a-4888-b692-e88ed8c1978e	10A	normal	t
b995bcef-80f1-4b18-9de4-cd0b912b0346	4b6316d1-733a-4888-b692-e88ed8c1978e	10B	normal	t
f792a740-981a-45c9-9699-4d85c5f01c65	cfb066d5-ccc8-44c7-a59a-86dda08804d8	1A	business	t
3127974b-9515-4cb6-9557-914014aafe29	cfb066d5-ccc8-44c7-a59a-86dda08804d8	1B	business	t
09214c6c-5b29-48aa-9f30-31f60db415a0	cfb066d5-ccc8-44c7-a59a-86dda08804d8	1C	business	t
6f325f0d-1364-4908-a976-da2d2c89296a	cfb066d5-ccc8-44c7-a59a-86dda08804d8	1D	business	t
13525ced-24a8-4c28-8777-bd8443df0745	cfb066d5-ccc8-44c7-a59a-86dda08804d8	2A	normal	t
98621363-02d7-46bd-b7da-c7259e9423ad	cfb066d5-ccc8-44c7-a59a-86dda08804d8	2B	normal	t
c6189167-bb9f-490f-b328-13daccefc127	cfb066d5-ccc8-44c7-a59a-86dda08804d8	2C	normal	t
4dd73696-5954-4dab-a6ab-6389eb66a6e8	cfb066d5-ccc8-44c7-a59a-86dda08804d8	2D	normal	t
8d9030ef-41c8-46c1-b724-5ceeb9a6c1f4	cfb066d5-ccc8-44c7-a59a-86dda08804d8	3A	normal	t
b18b057a-0b47-4b76-9c72-4569d2ac41d3	cfb066d5-ccc8-44c7-a59a-86dda08804d8	3B	normal	t
87a7a79f-7557-4b2c-bacc-e0d887a1f9f1	cfb066d5-ccc8-44c7-a59a-86dda08804d8	3C	normal	t
8d2d0996-65b9-47cb-9370-0406fd11fa03	cfb066d5-ccc8-44c7-a59a-86dda08804d8	3D	normal	t
4d72af77-3264-4149-8a6d-9e8823d1c251	cfb066d5-ccc8-44c7-a59a-86dda08804d8	4A	normal	t
3ead8443-4f4e-4430-aba9-c5eaed70d7bc	cfb066d5-ccc8-44c7-a59a-86dda08804d8	4B	normal	t
c00a6b63-2e47-4acb-a252-5db58ef3bcad	cfb066d5-ccc8-44c7-a59a-86dda08804d8	4C	normal	t
bb91d009-8693-4dd5-bc7f-1984d043e9a8	cfb066d5-ccc8-44c7-a59a-86dda08804d8	4D	normal	t
8081532c-29b8-46ce-8df0-2da7bbb74fac	cfb066d5-ccc8-44c7-a59a-86dda08804d8	5A	normal	t
6054496e-386e-42d2-a7eb-dc1a1f1e2b8a	cfb066d5-ccc8-44c7-a59a-86dda08804d8	5B	normal	t
343baba9-99fb-47e1-aa72-ca1514bece17	cfb066d5-ccc8-44c7-a59a-86dda08804d8	5C	normal	t
607845aa-9014-4fe5-a85a-93196f154706	cfb066d5-ccc8-44c7-a59a-86dda08804d8	5D	normal	t
bcc18ef2-052c-4a84-9081-cbf37eb8968d	cfb066d5-ccc8-44c7-a59a-86dda08804d8	6A	normal	t
00a4585b-962d-42b8-964b-eb3aa9928d20	cfb066d5-ccc8-44c7-a59a-86dda08804d8	6B	normal	t
ff71361b-1ba1-42a1-845f-0ca3895c3054	cfb066d5-ccc8-44c7-a59a-86dda08804d8	6C	normal	t
a2a78f59-7ffb-431e-b0ce-647f08df5e9c	cfb066d5-ccc8-44c7-a59a-86dda08804d8	6D	normal	t
dbd67199-4db4-47ed-afb3-452090e85ca6	cfb066d5-ccc8-44c7-a59a-86dda08804d8	7A	normal	t
9edb2284-8ce5-4922-9461-17d296ba73d7	cfb066d5-ccc8-44c7-a59a-86dda08804d8	7B	normal	t
314cf6c7-11a6-4f5f-8976-9a57bd4de4cd	cfb066d5-ccc8-44c7-a59a-86dda08804d8	7C	normal	t
e21990ad-3e1b-44ec-9646-6936a68b2e83	cfb066d5-ccc8-44c7-a59a-86dda08804d8	7D	normal	t
d9c967e9-0dfc-4df8-b7b0-7899d4200692	cfb066d5-ccc8-44c7-a59a-86dda08804d8	8A	normal	t
ab759817-f56b-4f8d-9444-36502bff537d	cfb066d5-ccc8-44c7-a59a-86dda08804d8	8B	normal	t
209a9b95-9042-4847-9570-d75bf3e4ac17	cfb066d5-ccc8-44c7-a59a-86dda08804d8	8C	normal	t
7615acb7-1577-4608-ab6f-262cd919c20b	cfb066d5-ccc8-44c7-a59a-86dda08804d8	8D	normal	t
d749a99c-af06-407a-9adb-7092d06e67dc	cfb066d5-ccc8-44c7-a59a-86dda08804d8	9A	normal	t
493d9e53-309a-4393-a565-e6c68d156ff9	cfb066d5-ccc8-44c7-a59a-86dda08804d8	9B	normal	t
\.


--
-- Data for Name: trips; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trips (id, route_id, bus_id, departure_time, arrival_time, base_price, status) FROM stdin;
019fa063-1d0c-4ee7-bfa4-9d1338f4a84a	0a299466-e414-4e23-8841-0b5f2e312200	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	2025-12-06 05:00:00+07	2025-12-06 13:00:00+07	350000.00	scheduled
4049155a-a26b-4f6b-89b1-48d264cae0b9	1e989554-68b7-4bc5-af27-4f42a8c5ab24	9b000c86-c184-41da-8034-b65f75f57728	2025-12-06 13:30:00+07	2025-12-06 19:30:00+07	220000.00	scheduled
fb7ace5f-09ea-45ec-942b-d62ba2c8ed9c	0a299466-e414-4e23-8841-0b5f2e312200	cfb066d5-ccc8-44c7-a59a-86dda08804d8	2025-12-05 15:00:00+07	2025-12-05 23:00:00+07	420000.00	scheduled
6f304d61-2d83-4325-b34b-63bed27407fc	a8bcb67f-cbab-44e7-b9a4-a2ed695e5f69	563bfb74-5c5d-445c-b6a8-10870c1036c2	2025-12-07 16:00:00+07	2025-12-07 18:30:00+07	90000.00	scheduled
897f674f-8d41-414b-8edf-0dae01d3372f	4e3fbbee-5228-4775-905e-3e5c29e059a0	4b6316d1-733a-4888-b692-e88ed8c1978e	2025-12-08 21:00:00+07	2025-12-08 23:00:00+07	120000.00	scheduled
f48c53a9-1478-4828-b3ad-5db9ff8917ec	a15aea5b-4e8e-49e8-8e29-d7ac669cac74	cfb066d5-ccc8-44c7-a59a-86dda08804d8	2025-12-09 14:30:00+07	2025-12-09 17:00:00+07	150000.00	scheduled
f472fd82-880b-41d9-8c6c-1b6b2418d5c7	a69637bc-c9d3-4727-9115-a72f91dab4e6	f24c127b-c2ae-4f6d-8639-1db9eb2763aa	2025-12-11 03:00:00+07	2025-12-11 07:00:00+07	200000.00	scheduled
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, "googleId", email, name, phone, password_hash, role, created_at) FROM stdin;
aa206880-179b-4709-a9fd-4988fe45b55f	\N	phatk222@gmail.com	phatk222	0919835255	$2b$10$qdytORKwD5q3zPYiWmVBZeUFe1GWPvrLYbg8jXAvyOPQe23xUy2qe	admin	2025-12-01 08:48:19.023293
0af35b67-cfa7-4db5-aecb-01490966f09d	\N	phat.ht.22@gmail.com	Phát Hồ	0919835255	$2b$10$Y7TK90gb8jGw9MN0eCcn1et79zm9pRIZaGkPfzMoqIn.9ldpCqBhy	customer	2025-12-15 11:25:14.606941
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 2, true);


--
-- Name: passenger_details PK_06422dddff22d9af8cf874c6d2e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passenger_details
    ADD CONSTRAINT "PK_06422dddff22d9af8cf874c6d2e" PRIMARY KEY (id);


--
-- Name: seat_status PK_1130421736afc3c987cb46a6f2a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seat_status
    ADD CONSTRAINT "PK_1130421736afc3c987cb46a6f2a" PRIMARY KEY (id);


--
-- Name: payments PK_197ab7af18c93fbb0c9b28b4a59; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY (id);


--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- Name: seat_layouts PK_248f4bfc8320776a1a4217c7f50; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seat_layouts
    ADD CONSTRAINT "PK_248f4bfc8320776a1a4217c7f50" PRIMARY KEY (id);


--
-- Name: payment_methods PK_34f9b8c6dfb4ac3559f7e2820d1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT "PK_34f9b8c6dfb4ac3559f7e2820d1" PRIMARY KEY (id);


--
-- Name: operators PK_3d02b3692836893720335a79d1b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operators
    ADD CONSTRAINT "PK_3d02b3692836893720335a79d1b" PRIMARY KEY (id);


--
-- Name: seats PK_3fbc74bb4638600c506dcb777a7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT "PK_3fbc74bb4638600c506dcb777a7" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: routes PK_76100511cdfa1d013c859f01d8b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT "PK_76100511cdfa1d013c859f01d8b" PRIMARY KEY (id);


--
-- Name: feedbacks PK_79affc530fdd838a9f1e0cc30be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT "PK_79affc530fdd838a9f1e0cc30be" PRIMARY KEY (id);


--
-- Name: refresh_tokens PK_7d8bee0204106019488c4c50ffa; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: route_points PK_9684d129d71ff38906e7cb08c68; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.route_points
    ADD CONSTRAINT "PK_9684d129d71ff38906e7cb08c68" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: bookings PK_bee6805982cc1e248e94ce94957; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY (id);


--
-- Name: buses PK_ddebc0eeba64a019ae072975947; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buses
    ADD CONSTRAINT "PK_ddebc0eeba64a019ae072975947" PRIMARY KEY (id);


--
-- Name: trips PK_f71c231dee9c05a9522f9e840f5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "PK_f71c231dee9c05a9522f9e840f5" PRIMARY KEY (id);


--
-- Name: buses UQ_3f4ba55c6743181511a419c3b80; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buses
    ADD CONSTRAINT "UQ_3f4ba55c6743181511a419c3b80" UNIQUE (plate_number);


--
-- Name: operators UQ_b6e94f1512bebbc88e901f01b04; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operators
    ADD CONSTRAINT "UQ_b6e94f1512bebbc88e901f01b04" UNIQUE (contact_email);


--
-- Name: users UQ_f382af58ab36057334fb262efd5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_f382af58ab36057334fb262efd5" UNIQUE ("googleId");


--
-- Name: idx_booking_reference_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_booking_reference_unique ON public.bookings USING btree (booking_reference) WHERE (booking_reference IS NOT NULL);


--
-- Name: idx_bookings_analytics_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_analytics_composite ON public.bookings USING btree (booked_at, status, total_amount, trip_id);


--
-- Name: idx_bookings_booked_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_booked_at ON public.bookings USING btree (booked_at);


--
-- Name: idx_bookings_booked_at_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_booked_at_status ON public.bookings USING btree (booked_at, status) WHERE (booked_at IS NOT NULL);


--
-- Name: idx_bookings_contact_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_contact_email ON public.bookings USING btree (contact_email);


--
-- Name: idx_bookings_contact_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_contact_phone ON public.bookings USING btree (contact_phone);


--
-- Name: idx_bookings_date_status_analytics; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_date_status_analytics ON public.bookings USING btree (booked_at, status) WHERE (booked_at IS NOT NULL);


--
-- Name: idx_bookings_last_modified_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_last_modified_at ON public.bookings USING btree (last_modified_at);


--
-- Name: idx_bookings_paid_recent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_paid_recent ON public.bookings USING btree (booked_at, total_amount) WHERE (status = 'paid'::public.bookings_status_enum);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_bookings_status_amount_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_status_amount_date ON public.bookings USING btree (status, total_amount, booked_at) WHERE (status = 'paid'::public.bookings_status_enum);


--
-- Name: idx_bookings_summary_covering; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_summary_covering ON public.bookings USING btree (booked_at, status) INCLUDE (total_amount, trip_id);


--
-- Name: idx_bookings_trip_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_trip_id ON public.bookings USING btree (trip_id);


--
-- Name: idx_bookings_trip_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_trip_status ON public.bookings USING btree (trip_id, status);


--
-- Name: idx_bookings_trip_status_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_trip_status_date ON public.bookings USING btree (trip_id, status, booked_at);


--
-- Name: idx_bookings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_user_id ON public.bookings USING btree (user_id);


--
-- Name: idx_bookings_user_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_user_status ON public.bookings USING btree (user_id, status);


--
-- Name: idx_bookings_user_trip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bookings_user_trip ON public.bookings USING btree (user_id, trip_id);


--
-- Name: idx_buses_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_buses_model ON public.buses USING btree (model);


--
-- Name: idx_buses_operator_capacity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_buses_operator_capacity ON public.buses USING btree (operator_id, seat_capacity);


--
-- Name: idx_buses_operator_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_buses_operator_id ON public.buses USING btree (operator_id);


--
-- Name: idx_buses_operator_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_buses_operator_model ON public.buses USING btree (operator_id, model);


--
-- Name: idx_buses_plate_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_buses_plate_number ON public.buses USING btree (plate_number);


--
-- Name: idx_operators_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_operators_email ON public.operators USING btree (contact_email);


--
-- Name: idx_operators_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_operators_name ON public.operators USING btree (name);


--
-- Name: idx_operators_name_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_operators_name_status ON public.operators USING btree (name, status);


--
-- Name: idx_operators_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_operators_status ON public.operators USING btree (status);


--
-- Name: idx_routes_analytics_covering; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_routes_analytics_covering ON public.routes USING btree (id) INCLUDE (name, origin, destination);


--
-- Name: idx_seat_layouts_bus_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seat_layouts_bus_id ON public.seat_layouts USING btree (bus_id);


--
-- Name: idx_seat_layouts_bus_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seat_layouts_bus_type ON public.seat_layouts USING btree (bus_id, "layoutType");


--
-- Name: idx_seat_layouts_capacity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seat_layouts_capacity ON public.seat_layouts USING btree (bus_id, total_rows, seats_per_row);


--
-- Name: idx_seat_layouts_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seat_layouts_created_at ON public.seat_layouts USING btree (created_at);


--
-- Name: idx_seat_layouts_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seat_layouts_type ON public.seat_layouts USING btree ("layoutType");


--
-- Name: idx_seat_status_trip_state; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seat_status_trip_state ON public.seat_status USING btree (trip_id, state) WHERE (state = 'booked'::public.seat_status_state_enum);


--
-- Name: idx_trips_active_recent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_active_recent ON public.trips USING btree (departure_time, route_id);


--
-- Name: idx_trips_arrival_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_arrival_time ON public.trips USING btree (arrival_time);


--
-- Name: idx_trips_bus_departure; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_bus_departure ON public.trips USING btree (bus_id, departure_time);


--
-- Name: idx_trips_bus_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_bus_id ON public.trips USING btree (bus_id);


--
-- Name: idx_trips_date_route_analytics; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_date_route_analytics ON public.trips USING btree (departure_time, route_id) WHERE (departure_time IS NOT NULL);


--
-- Name: idx_trips_departure_bus; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_departure_bus ON public.trips USING btree (departure_time, bus_id) WHERE (departure_time IS NOT NULL);


--
-- Name: idx_trips_departure_route; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_departure_route ON public.trips USING btree (departure_time, route_id) WHERE ((departure_time IS NOT NULL) AND (route_id IS NOT NULL));


--
-- Name: idx_trips_departure_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_departure_time ON public.trips USING btree (departure_time);


--
-- Name: idx_trips_route_bus_departure; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_route_bus_departure ON public.trips USING btree (route_id, bus_id, departure_time);


--
-- Name: idx_trips_route_departure; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_route_departure ON public.trips USING btree (route_id, departure_time);


--
-- Name: idx_trips_route_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_route_id ON public.trips USING btree (route_id);


--
-- Name: idx_trips_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_status ON public.trips USING btree (status);


--
-- Name: idx_trips_status_departure; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_status_departure ON public.trips USING btree (status, departure_time);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_google_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_google_id ON public.users USING btree ("googleId");


--
-- Name: idx_users_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_name ON public.users USING btree (name);


--
-- Name: idx_users_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_phone ON public.users USING btree (phone);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_role_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role_created ON public.users USING btree (role, created_at);


--
-- Name: passenger_details FK_0c19f8559ce0e7b47baa5455ad3; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passenger_details
    ADD CONSTRAINT "FK_0c19f8559ce0e7b47baa5455ad3" FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: seat_layouts FK_23691ddc597bf70420e511ab6c6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seat_layouts
    ADD CONSTRAINT "FK_23691ddc597bf70420e511ab6c6" FOREIGN KEY (bus_id) REFERENCES public.buses(id);


--
-- Name: notifications FK_3f5c2196c2b2af99a4697e51741; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_3f5c2196c2b2af99a4697e51741" FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: seat_status FK_40b48933387606c841426123cac; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seat_status
    ADD CONSTRAINT "FK_40b48933387606c841426123cac" FOREIGN KEY (seat_id) REFERENCES public.seats(id);


--
-- Name: feedbacks FK_4334f6be2d7d841a9d5205a100e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT "FK_4334f6be2d7d841a9d5205a100e" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bookings FK_45fa98a28a6944e39d8a5754bd1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_45fa98a28a6944e39d8a5754bd1" FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- Name: refresh_tokens FK_610102b60fea1455310ccd299de; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: feedbacks FK_62ff6a19bf6fc9e0770fe24c58d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT "FK_62ff6a19bf6fc9e0770fe24c58d" FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- Name: seats FK_63891430d84257508216445c058; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT "FK_63891430d84257508216445c058" FOREIGN KEY (bus_id) REFERENCES public.buses(id);


--
-- Name: bookings FK_64cd97487c5c42806458ab5520c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "FK_64cd97487c5c42806458ab5520c" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: routes FK_699c50db7c54c0ef95c806abd7f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT "FK_699c50db7c54c0ef95c806abd7f" FOREIGN KEY (operator_id) REFERENCES public.operators(id);


--
-- Name: seat_status FK_85cb79c299aa3acb277ed736434; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seat_status
    ADD CONSTRAINT "FK_85cb79c299aa3acb277ed736434" FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: route_points FK_a2eab28234f80f4a7962495d5b6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.route_points
    ADD CONSTRAINT "FK_a2eab28234f80f4a7962495d5b6" FOREIGN KEY ("routeId") REFERENCES public.routes(id) ON DELETE CASCADE;


--
-- Name: buses FK_a5d51574b60f8848d203e5f4241; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buses
    ADD CONSTRAINT "FK_a5d51574b60f8848d203e5f4241" FOREIGN KEY (operator_id) REFERENCES public.operators(id);


--
-- Name: payment_methods FK_d7d7fb15569674aaadcfbc0428c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT "FK_d7d7fb15569674aaadcfbc0428c" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: trips FK_de94f3218372c5bdfe1638c07c3; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "FK_de94f3218372c5bdfe1638c07c3" FOREIGN KEY (bus_id) REFERENCES public.buses(id);


--
-- Name: trips FK_e49dbbd9991c9b7baec9779e7ce; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "FK_e49dbbd9991c9b7baec9779e7ce" FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: payments FK_e86edf76dc2424f123b9023a2b2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2" FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: seat_status FK_e8a46b0dca3d048c97d74adfbe7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seat_status
    ADD CONSTRAINT "FK_e8a46b0dca3d048c97d74adfbe7" FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- PostgreSQL database dump complete
--

